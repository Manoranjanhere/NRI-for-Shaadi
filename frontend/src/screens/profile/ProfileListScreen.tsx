import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize } from '../../theme';
import ProfileService, { type Paginated, type ProfileSummary } from '../../services/profile.service';
import ProfileRow, { RowButton } from '../../components/profile/ProfileRow';
import { handleActionError } from '../../utils/subscription';
import { timeAgo } from '../../utils/profileFormat';
import type { RootStackParamList } from '../../navigation/types';

type Item = ProfileSummary & { shortlistedAt?: string; viewedAt?: string };
type Props = NativeStackScreenProps<RootStackParamList, 'Shortlist' | 'ProfileVisitors'>;

const CONFIG = {
  Shortlist: {
    title: 'Shortlisted',
    subtitle: 'Profiles you saved to review with family.',
    fetch: (p: number) => ProfileService.getShortlist(p) as Promise<Paginated<Item>>,
    caption: (i: Item) => `Saved ${timeAgo(i.shortlistedAt)}`,
    empty: { icon: '⭐', title: 'Nothing shortlisted yet', body: 'Tap ☆ on any profile to save it here and discuss with your family.' },
  },
  ProfileVisitors: {
    title: 'Profile visitors',
    subtitle: 'Members who recently viewed your profile.',
    fetch: (p: number) => ProfileService.getProfileVisitors(p) as Promise<Paginated<Item>>,
    caption: (i: Item) => `Viewed ${timeAgo(i.viewedAt)}`,
    empty: { icon: '👀', title: 'No visitors yet', body: 'A complete profile with good photos attracts far more visitors.' },
  },
};

/** Shared list screen for Shortlist and Profile Visitors. */
export default function ProfileListScreen({ navigation, route }: Props) {
  const config = CONFIG[route.name];
  const [items, setItems] = useState<Item[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (pageNum: number, refresh = false) => {
      if (refresh) setRefreshing(true);
      try {
        const res = await config.fetch(pageNum);
        setItems((prev) => (pageNum === 1 ? res.users : [...prev, ...res.users]));
        setPage(pageNum);
        setPages(res.pages);
      } catch (err) {
        handleActionError(navigation, err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [config, navigation],
  );

  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load]),
  );

  const removeFromShortlist = async (item: Item) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    try {
      await ProfileService.toggleShortlist(item.id);
    } catch (err) {
      handleActionError(navigation, err);
      load(1);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.subtitle}>{config.subtitle}</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={Colors.secondary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProfileRow
              profile={item}
              caption={config.caption(item)}
              onPress={() => navigation.navigate('ProfileDetail', { userId: item.id })}
            >
              {route.name === 'Shortlist' ? (
                <>
                  <RowButton label="Remove" variant="outline" onPress={() => removeFromShortlist(item)} />
                  <RowButton label="View profile" onPress={() => navigation.navigate('ProfileDetail', { userId: item.id })} />
                </>
              ) : null}
            </ProfileRow>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(1, true)} tintColor={Colors.secondary} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (page < pages) load(page + 1);
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{config.empty.icon}</Text>
              <Text style={styles.emptyTitle}>{config.empty.title}</Text>
              <Text style={styles.emptyBody}>{config.empty.body}</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.sm },
  back: { color: Colors.textPrimary, fontSize: 34, lineHeight: 36, width: 32 },
  title: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '800' },
  subtitle: { color: Colors.textSecondary, fontSize: FontSize.sm },
  list: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xxl },
  empty: { alignItems: 'center', paddingVertical: Spacing.xxl, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  emptyIcon: { fontSize: 44 },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  emptyBody: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
});
