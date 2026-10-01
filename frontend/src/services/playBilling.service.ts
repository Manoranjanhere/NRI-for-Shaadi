import { Platform, Alert } from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  ErrorCode,
  type Purchase,
  type ProductSubscription,
  type ProductSubscriptionAndroid,
  type PurchaseError,
} from 'react-native-iap';
import { api } from './api';
import { useAuthStore } from '../store/auth.store';

let connectionReady = false;
const productCache = new Map<string, ProductSubscription>();

async function ensureConnection(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    Alert.alert('Not available', 'Google Play billing is only available on Android.');
    return false;
  }
  if (!connectionReady) {
    try {
      connectionReady = await initConnection();
    } catch {
      connectionReady = false;
    }
  }
  return connectionReady;
}

/** Must match a subscription created in Google Play Console (e.g. `nrishaadi_premium_1m`). */
function getProductId(planId: string): string {
  return `nrishaadi_${planId}_1m`;
}

function buildAndroidSubscriptionOffers(
  subscription: ProductSubscription,
  sku: string,
): { sku: string; offerToken: string }[] {
  const android = subscription as ProductSubscriptionAndroid;

  if (android.subscriptionOffers?.length) {
    const offers = android.subscriptionOffers
      .filter((offer) => offer.offerTokenAndroid)
      .map((offer) => ({
        sku,
        offerToken: offer.offerTokenAndroid as string,
      }));
    if (offers.length) return offers;
  }

  const legacyDetails = (android as ProductSubscriptionAndroid & {
    subscriptionOfferDetailsAndroid?: { offerToken?: string }[];
  }).subscriptionOfferDetailsAndroid;

  if (legacyDetails?.length) {
    const offers = legacyDetails
      .filter((detail) => detail.offerToken)
      .map((detail) => ({
        sku,
        offerToken: detail.offerToken as string,
      }));
    if (offers.length) return offers;
  }

  throw new Error(
    `No subscription offers found for ${sku}. Configure a base plan in Google Play Console.`,
  );
}

async function loadSubscriptionProduct(sku: string): Promise<ProductSubscription> {
  const cached = productCache.get(sku);
  if (cached && cached.type === 'subs') {
    return cached as ProductSubscription;
  }

  const products = await fetchProducts({ skus: [sku], type: 'subs' });
  const subscription = products?.find((item) => item.id === sku && item.type === 'subs') as
    | ProductSubscription
    | undefined;

  if (!subscription) {
    throw new Error(`Subscription ${sku} not found in Google Play`);
  }

  productCache.set(sku, subscription);
  return subscription;
}

async function verifySubscriptionOnServer(purchase: Purchase) {
  const productId = purchase.productId;
  const purchaseToken = purchase.purchaseToken;
  if (!productId || !purchaseToken) {
    throw new Error('Missing purchase data from Google Play');
  }

  const { data } = await api.post('/subscriptions/google-play/verify-subscription', {
    productId,
    purchaseToken,
  });

  if (data.user) {
    useAuthStore.getState().updateUser(data.user);
  }

  return data;
}

function isUserCancelled(err: PurchaseError | Error): boolean {
  if ('code' in err && err.code === ErrorCode.UserCancelled) {
    return true;
  }
  return String((err as Error).message || '').toLowerCase().includes('cancel');
}

export async function fetchPlaySubscriptions(
  productIds: string[],
): Promise<ProductSubscription[]> {
  const ok = await ensureConnection();
  if (!ok || !productIds.length) return [];
  try {
    const products = await fetchProducts({ skus: productIds, type: 'subs' });
    const subscriptions = (products ?? []).filter(
      (item): item is ProductSubscription => item.type === 'subs',
    );
    subscriptions.forEach((item) => productCache.set(item.id, item));
    return subscriptions;
  } catch {
    return [];
  }
}

/** Google Play localized price strings keyed by product SKU. */
export async function fetchLocalizedPlayPrices(subscriptionSkus: string[]): Promise<Record<string, string>> {
  const subs = await fetchPlaySubscriptions(subscriptionSkus);
  const map: Record<string, string> = {};
  subs.forEach((item) => {
    if (item.id && item.displayPrice) map[item.id] = item.displayPrice;
  });
  return map;
}

export async function purchasePlan(planId: string): Promise<void> {
  const ok = await ensureConnection();
  if (!ok) return;

  const sku = getProductId(planId);
  const subscription = await loadSubscriptionProduct(sku);
  const subscriptionOffers = buildAndroidSubscriptionOffers(subscription, sku);

  return new Promise((resolve, reject) => {
    const subUpdate = purchaseUpdatedListener(async (purchase) => {
      if (purchase.productId !== sku) return;
      try {
        await verifySubscriptionOnServer(purchase);
        await finishTransaction({ purchase, isConsumable: false });
        subUpdate.remove();
        subError.remove();
        resolve();
      } catch (e) {
        subUpdate.remove();
        subError.remove();
        reject(e);
      }
    });

    const subError = purchaseErrorListener((err) => {
      subUpdate.remove();
      subError.remove();
      if (!isUserCancelled(err)) {
        reject(err);
      } else {
        reject(new Error('Purchase cancelled'));
      }
    });

    requestPurchase({
      request: {
        android: {
          skus: [sku],
          subscriptionOffers,
        },
      },
      type: 'subs',
    }).catch((e) => {
      subUpdate.remove();
      subError.remove();
      reject(e);
    });
  });
}

export async function disconnectBilling() {
  if (connectionReady) {
    await endConnection();
    connectionReady = false;
    productCache.clear();
  }
}

export const PlayBilling = {
  getProductId,
  fetchPlaySubscriptions,
  fetchLocalizedPlayPrices,
  purchasePlan,
  disconnectBilling,
};

export default PlayBilling;
