import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, FontSize, BorderRadius } from '../../theme';
import DiscoverService, {
  countActiveFilters,
  type MatchCardUser,
  type MatchFilters,
  type MatchSort,
} from '../../services/discover.service';
import ProfileService from '../../services/profile.service';
import MatchCard from '../../components/discover/MatchCard';
import FiltersModal from '../../components/discover/FiltersModal';
import MembershipBanner from '../../components/subscription/MembershipBanner';
import BrandLogo from '../../components/brand/BrandLogo';
import { useAuthStore } from '../../store/auth.store';
import { storage } from '../../services/api';
import { useInteractionAccess } from '../../hooks/useInteractionAccess';
import { handleActionError } from '../../utils/subscription';

const FILTERS_KEY = 'matchFilters';
const SORTS: { key: MatchSort; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'newest', label: 'New members' },
  { key: 'active', label: 'Recently active' },
];

function loadSavedFilters(): MatchFilters {
  try {
    return JSON.parse(storage.getString(FILTERS_KEY) ?? '{}');
  } catch {
    return {};
  }
}

export default function DiscoverScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const { requireAccess } = useInteractionAccess();

  const [items, setItems] = useState<MatchCardUser[]>([]);
  const [total, setTotal] = useState(0);
  const [sort, setSort] = useState<MatchSort>('recommended');
  const [filters, setFilters] = useState<MatchFilters>(loadSavedFilters);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [interestState, setInterestState] = useState<Record<string, 'sending' | 'sent'>>({});
  const [connected, setConnected] = useState<MatchCardUser | null>(null);
  const [undo, setUndo] = useState<{ user: MatchCardUser; index: number } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (pageNum: number, mode: 'initial' | 'refresh' | 'more') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      try {
        const res = await DiscoverService.getMatches(filters, sort, pageNum);
        setItems((prev) => (pageNum === 1 ? res.users : [...prev, ...res.users.filter((u) => !prev.some((p) => p.id === u.id))]));
        setTotal(res.total);
        setPage(pageNum);
        setPages(res.pages);
        if (pageNum === 1) setInterestState({});
      } catch (err) {
        handleActionError(navigation, err, 'Could not load matches');
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filters, sort, navigation],
  );

  useEffect(() => {
    load(1, 'initial');
  }, [load]);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  const applyFilters = (next: MatchFilters) => {
    storage.set(FILTERS_KEY, JSON.stringify(next));
    setFilters(next);
    setShowFilters(false);
  };

  const sendInterest = async (target: MatchCardUser) => {
    if (!requireAccess('send interests')) return;
    setInterestState((s) => ({ ...s, [target.id]: 'sending' }));
    try {
      const res = await ProfileService.toggleInterest(target.id);
      setInterestState((s) => ({ ...s, [target.id]: 'sent' }));
      if (res.isMatch) setConnected(target);
    } catch (err) {
      setInterestState((s) => {
        const { [target.id]: _removed, ...rest } = s;
        return rest;
      });
      handleActionError(navigation, err, 'Could not send interest');
    }
  };

  const toggleShortlist = async (target: MatchCardUser) => {
    setItems((prev) => prev.map((u) => (u.id === target.id ? { ...u, isShortlisted: !u.isShortlisted } : u)));
    try {
      await ProfileService.toggleShortlist(target.id);
    } catch (err) {
      setItems((prev) => prev.map((u) => (u.id === target.id ? { ...u, isShortlisted: target.isShortlisted } : u)));
      handleActionError(navigation, err);
    }
  };

  const skip = async (target: MatchCardUser) => {
    const index = items.findIndex((u) => u.id === target.id);
    setItems((prev) => prev.filter((u) => u.id !== target.id));
    setUndo({ user: target, index });
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 4000);
    DiscoverService.passUser(target.id).catch(() => undefined);
  };

  const undoSkip = async () => {
    if (!undo) return;
    const { user: restored, index } = undo;
    setUndo(null);
    setItems((prev) => {
      const next = [...prev];
      next.splice(Math.max(0, index), 0, restored);
      return next;
    });
    DiscoverService.undoPass(restored.id).catch(() => undefined);
  };

  const filterCount = countActiveFilters(filters);

  const header = (
    <View>
      <View style={styles.sortRow}>
        {SORTS.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.sortChip, sort === s.key && styles.sortChipActive]}
            onPress={() => setSort(s.key)}
          >
            <Text style={[styles.sortText, sort === s.key && styles.sortTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <MembershipBanner compact />
      {!user?.partnerPreferences ? (
        <TouchableOpacity style={styles.nudge} onPress={() => navigation.navigate('PartnerPreferences')}>
          <Text style={styles.nudgeText}>✨ Set your partner preferences to get better recommendations ›</Text>
        </TouchableOpacity>
      ) : null}
      <View style={styles.countRow}>
        <Text style={styles.countText}>
          {total} {total === 1 ? 'profile' : 'profiles'}
          {filterCount ? ` · ${filterCount} filter${filterCount > 1 ? 's' : ''}` : ''}
        </Text>
        {filterCount ? (
          <TouchableOpacity onPress={() => applyFilters({})}>
            <Text style={styles.clear}>Clear filters</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <BrandLogo size={30} />
        <View style={styles.topActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Shortlist')}>
            <Text style={styles.iconText}>★</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setShowFilters(true)}>
            <Text style={styles.iconText}>⚙︎</Text>
            {filterCount ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{filterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.secondary} size="large" />
          <Text style={styles.muted}>Finding your matches…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(u) => u.id}
          ListHeaderComponent={header}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MatchCard
              user={item}
              interestState={interestState[item.id] ?? 'none'}
              onOpen={() => navigation.navigate('ProfileDetail', { userId: item.id })}
              onInterest={() => sendInterest(item)}
              onShortlist={() => toggleShortlist(item)}
              onSkip={() => skip(item)}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, 'refresh')} tintColor={Colors.secondary} />}
          onEndReachedThreshold={0.6}
          onEndReached={() => {
            if (!loadingMore && page < pages) load(page + 1, 'more');
          }}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.secondary} style={{ margin: Spacing.lg }} /> : null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>💍</Text>
              <Text style={styles.emptyTitle}>No profiles match right now</Text>
              <Text style={styles.muted}>
                Try widening your filters — for example adding more countries or a broader age range. New members join every day.
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowFilters(true)}>
                <Text style={styles.emptyBtnText}>Adjust filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {undo ? (
        <View style={[styles.snackbar, { bottom: Spacing.md }]}>
          <Text style={styles.snackText}>Hidden {undo.user.name}</Text>
          <TouchableOpacity onPress={undoSkip}>
            <Text style={styles.snackAction}>UNDO</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FiltersModal visible={showFilters} filters={filters} onApply={applyFilters} onClose={() => setShowFilters(false)} />

      <Modal transparent animationType="fade" visible={!!connected} onRequestClose={() => setConnected(null)}>
        <View style={styles.overlay}>
          <View style={styles.connectedCard}>
            <Text style={styles.connectedEmoji}>🎉</Text>
            <Text style={styles.connectedTitle}>You’re connected!</Text>
            <Text style={styles.muted}>
              {connected?.name} had already shown interest in you. Start a conversation — contact details are now visible on their
              profile.
            </Text>
            <TouchableOpacity
              style={styles.connectedBtn}
              onPress={() => {
                const target = connected;
                setConnected(null);
                if (target) navigation.navigate('ChatConversation', { userId: target.id, userName: target.name });
              }}
            >
              <Text style={styles.connectedBtnText}>Say Namaste 🙏</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setConnected(null)}>
              <Text style={styles.later}>Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  topActions: { flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { color: Colors.secondary, fontSize: 18 },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  sortRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm + 4 },
  sortChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortChipActive: { backgroundColor: Colors.secondary, borderColor: Colors.secondary },
  sortText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  sortTextActive: { color: '#2B0510' },
  nudge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm + 4,
    marginBottom: Spacing.sm + 4,
  },
  nudgeText: { color: Colors.secondaryLight, fontSize: FontSize.sm, fontWeight: '600' },
  countRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm + 4 },
  countText: { color: Colors.textMuted, fontSize: FontSize.sm },
  clear: { color: Colors.secondary, fontSize: FontSize.sm, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  muted: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },
  emptyBtn: { marginTop: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700' },
  snackbar: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  snackText: { color: Colors.textPrimary, fontSize: FontSize.sm },
  snackAction: { color: Colors.secondary, fontWeight: '800' },
  overlay: { flex: 1, backgroundColor: Colors.overlay, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  connectedCard: {
    width: '100%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  connectedEmoji: { fontSize: 52 },
  connectedTitle: { color: Colors.secondaryLight, fontSize: FontSize.xxl, fontWeight: '800' },
  connectedBtn: { marginTop: Spacing.sm, backgroundColor: Colors.primary, borderRadius: BorderRadius.full, paddingVertical: 14, alignSelf: 'stretch', alignItems: 'center' },
  connectedBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  later: { color: Colors.textSecondary, marginTop: Spacing.sm },
});
