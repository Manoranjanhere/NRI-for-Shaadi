import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import ProfileService, { type InterestListItem, type Paginated } from '../../services/profile.service';
import ProfileRow, { RowButton } from '../../components/profile/ProfileRow';
import MembershipBanner from '../../components/subscription/MembershipBanner';
import { useInteractionAccess } from '../../hooks/useInteractionAccess';
import { handleActionError } from '../../utils/subscription';
import { timeAgo } from '../../utils/profileFormat';
import { useBadgeStore } from '../../store/badges.store';
import type { InterestsTab, MainTabParamList } from '../../navigation/types';

const TABS: { key: InterestsTab; label: string }[] = [
  { key: 'received', label: 'Received' },
  { key: 'sent', label: 'Sent' },
  { key: 'connections', label: 'Connections' },
];

const fetchers: Record<InterestsTab, (page: number) => Promise<Paginated<InterestListItem>>> = {
  received: (p) => ProfileService.getReceivedInterests(p),
  sent: (p) => ProfileService.getSentInterests(p),
  connections: (p) => ProfileService.getConnections(p),
};

const STATUS_BADGE = {
  pending: { text: 'Awaiting reply', color: Colors.secondary },
  accepted: { text: 'Accepted', color: Colors.success },
  declined: { text: 'Not interested', color: Colors.textMuted },
};

export default function InterestsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<MainTabParamList, 'Interests'>>();
  const insets = useSafeAreaInsets();
  const { requireAccess } = useInteractionAccess();

  const [tab, setTab] = useState<InterestsTab>(route.params?.tab ?? 'received');
  const [items, setItems] = useState<InterestListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (route.params?.tab) setTab(route.params.tab);
  }, [route.params?.tab]);

  const load = useCallback(
    async (pageNum: number, refresh = false) => {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);
      try {
        const res = await fetchers[tab](pageNum);
        setItems((prev) => (pageNum === 1 ? res.users : [...prev, ...res.users]));
        setPage(pageNum);
        setPages(res.pages);
        if (tab === 'received' && pageNum === 1) {
          ProfileService.markInterestsSeen()
            .then(() => useBadgeStore.getState().clearInterests())
            .catch(() => undefined);
        }
      } catch (err) {
        handleActionError(navigation, err, 'Could not load interests');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab, navigation],
  );

  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load]),
  );

  const accept = async (item: InterestListItem) => {
    if (!requireAccess('accept interests')) return;
    setBusy(item.id);
    try {
      await ProfileService.toggleInterest(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      Alert.alert('🎉 Connected!', `You and ${item.name} are now connected. Say hello!`, [
        { text: 'Later', style: 'cancel' },
        { text: 'Chat now', onPress: () => navigation.navigate('ChatConversation', { userId: item.id, userName: item.name }) },
      ]);
    } catch (err) {
      handleActionError(navigation, err);
    } finally {
      setBusy(null);
    }
  };

  const decline = (item: InterestListItem) => {
    Alert.alert('Decline interest?', `${item.name} won't be notified, and their profile will be hidden from your matches.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setBusy(item.id);
          try {
            await ProfileService.declineInterest(item.id);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } catch (err) {
            handleActionError(navigation, err);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const withdraw = (item: InterestListItem) => {
    Alert.alert('Withdraw interest?', `Your interest in ${item.name} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Withdraw',
        style: 'destructive',
        onPress: async () => {
          setBusy(item.id);
          try {
            await ProfileService.toggleInterest(item.id);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
          } catch (err) {
            handleActionError(navigation, err);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: InterestListItem }) => {
    const open = () => navigation.navigate('ProfileDetail', { userId: item.id });
    if (tab === 'received') {
      return (
        <ProfileRow profile={item} onPress={open} caption={`Interested ${timeAgo(item.likedAt)}`} note={item.interestMessage}>
          <RowButton label="Decline" variant="outline" onPress={() => decline(item)} disabled={busy === item.id} />
          <RowButton label="Accept" onPress={() => accept(item)} disabled={busy === item.id} />
        </ProfileRow>
      );
    }
    if (tab === 'sent') {
      return (
        <ProfileRow profile={item} onPress={open} caption={`Sent ${timeAgo(item.likedAt)}`} badge={STATUS_BADGE[item.interestStatus]}>
          {item.interestStatus === 'accepted' ? (
            <RowButton label="💬 Chat" onPress={() => navigation.navigate('ChatConversation', { userId: item.id, userName: item.name })} />
          ) : item.interestStatus === 'pending' ? (
            <RowButton label="Withdraw" variant="outline" onPress={() => withdraw(item)} disabled={busy === item.id} />
          ) : null}
        </ProfileRow>
      );
    }
    return (
      <ProfileRow profile={item} onPress={open} caption={`Connected ${timeAgo(item.matchedAt)}`}>
        <RowButton label="View profile" variant="outline" onPress={open} />
        <RowButton label="💬 Chat" onPress={() => navigation.navigate('ChatConversation', { userId: item.id, userName: item.name })} />
      </ProfileRow>
    );
  };

  const emptyCopy: Record<InterestsTab, { icon: string; title: string; body: string }> = {
    received: { icon: '💌', title: 'No new interests yet', body: 'Complete your profile and add clear photos — members are far more likely to reach out.' },
    sent: { icon: '📨', title: 'You haven’t sent any interests', body: 'Browse your matches and tap “Send Interest” on profiles you like.' },
    connections: { icon: '🤝', title: 'No connections yet', body: 'When someone accepts your interest (or you accept theirs), you can chat here.' },
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>Interests</Text>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} style={[styles.tab, tab === t.key && styles.tabActive]} onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.secondary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListHeaderComponent={<MembershipBanner compact />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} tintColor={Colors.secondary} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (page < pages) load(page + 1);
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{emptyCopy[tab].icon}</Text>
              <Text style={styles.emptyTitle}>{emptyCopy[tab].title}</Text>
              <Text style={styles.emptyBody}>{emptyCopy[tab].body}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { color: Colors.textPrimary, fontSize: FontSize.xxl, fontWeight: '800', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },
  tabs: {
    flexDirection: 'row',
    margin: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: BorderRadius.full, alignItems: 'center' },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm },
  tabTextActive: { color: '#fff' },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});
