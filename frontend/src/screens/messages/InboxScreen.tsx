import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { Colors, Spacing, FontSize } from '../../theme';
import MessageService, { InboxConversation } from '../../services/message.service';
import MembershipBanner from '../../components/subscription/MembershipBanner';
import { useBadgeStore } from '../../store/badges.store';
import { handleActionError } from '../../utils/subscription';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

export default function InboxScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<InboxConversation[]>([]);

  const loadInbox = useCallback(async () => {
    try {
      const data = await MessageService.getInbox();
      setConversations(data.conversations || []);
      useBadgeStore.getState().refresh().catch(() => undefined);
    } catch (err) {
      handleActionError(navigation, err, 'Could not load chats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadInbox();
    }, [loadInbox]),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <Text style={styles.subtitle}>Conversations with your connections</Text>
      </View>
      <MembershipBanner />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.secondary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={conversations.length === 0 ? { flexGrow: 1 } : { paddingBottom: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadInbox();
              }}
              tintColor={Colors.secondary}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.helper}>
                When someone accepts your interest (or you accept theirs), you can start chatting here.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('Main', { screen: 'Interests', params: { tab: 'connections' } })}
              >
                <Text style={styles.emptyBtnText}>View connections</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('ChatConversation', { userId: item.userId, userName: item.userName })}
            >
              <TouchableOpacity onPress={() => navigation.navigate('ProfileDetail', { userId: item.userId })} activeOpacity={0.85}>
                {item.primaryPhoto ? (
                  <FastImage source={{ uri: item.primaryPhoto }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>{item.userName?.[0]?.toUpperCase() || '?'}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.content}>
                <View style={styles.topLine}>
                  <Text style={[styles.name, item.unreadCount > 0 && styles.nameUnread]} numberOfLines={1}>
                    {item.userName}
                  </Text>
                  <Text style={styles.time}>{formatWhen(item.lastMessageAt)}</Text>
                </View>
                <View style={styles.bottomLine}>
                  <Text style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  title: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingHorizontal: 28 },
  helper: { color: Colors.textSecondary, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  emptyEmoji: { fontSize: 52, marginBottom: Spacing.xs },
  emptyTitle: { color: Colors.textPrimary, fontSize: FontSize.xl, fontWeight: '700' },
  emptyBtn: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.secondary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 999,
  },
  emptyBtnText: { color: '#2B0510', fontWeight: '800' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.surface },
  avatarPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.lg },
  content: { flex: 1, gap: 3 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  name: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', flex: 1 },
  nameUnread: { fontWeight: '800' },
  time: { color: Colors.textMuted, fontSize: FontSize.xs },
  bottomLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  preview: { color: Colors.textSecondary, fontSize: FontSize.sm, flex: 1 },
  previewUnread: { color: Colors.textPrimary },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
