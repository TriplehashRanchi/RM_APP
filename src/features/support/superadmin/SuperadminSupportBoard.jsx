import {
  ArrowLeft,
  CheckCheck,
  MessageSquareMore,
  Search,
  Send,
  ShieldAlert
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../../utils/api.js";
import SupportChatBubble from "../components/SupportChatBubble.jsx";
import SupportEmptyCard from "../components/SupportEmptyCard.jsx";
import SupportStatusBadge from "../components/SupportStatusBadge.jsx";
import { formatDateTime, SUPERADMIN_STATUS_FILTERS } from "../utils.js";

function sortQueries(list) {
  return [...list].sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at || 0).getTime() -
      new Date(a.updated_at || a.created_at || 0).getTime()
  );
}

function QueryListRow({ item, onPress }) {
  const initial = String(item.employee_name || item.subject || "Q").charAt(0).toUpperCase();
  const preview = item.description || item.subject || "No message available";

  return (
    <Pressable onPress={onPress} style={styles.queryRow}>
      <View style={styles.avatarWrap}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      <View style={styles.queryBody}>
        <View style={styles.queryTopRow}>
          <Text numberOfLines={1} style={styles.queryName}>
            {item.employee_name || "Employee"}
          </Text>
          <Text numberOfLines={1} style={styles.queryTime}>
            {formatDateTime(item.updated_at || item.created_at)}
          </Text>
        </View>

        <Text numberOfLines={1} style={styles.querySubject}>
          {item.subject || "Untitled query"}
        </Text>

        <View style={styles.queryBottomRow}>
          <Text numberOfLines={1} style={styles.querySnippet}>
            {preview}
          </Text>
          <SupportStatusBadge status={item.status} />
        </View>
      </View>
    </Pressable>
  );
}

export default function SuperadminSupportBoard({ user, onToast }) {
  const insets = useSafeAreaInsets();
  const [queries, setQueries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [reply, setReply] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");

  const totalQueries = useMemo(() => queries.length, [queries]);
  const selectedListItem = useMemo(
    () => queries.find((item) => item.id === selectedId) || null,
    [queries, selectedId]
  );

  const fetchQueries = useCallback(
    async ({ silent = false } = {}) => {
      if (!user) return;

      if (!silent) setLoading(true);
      try {
        const res = await api.get("/employee-queries", {
          params: {
            status: statusFilter || undefined,
            search: search.trim() || undefined,
          },
        });
        const list = sortQueries(Array.isArray(res.data?.data) ? res.data.data : []);
        setQueries(list);

        if (!list.length) {
          setSelectedId(null);
          setSelectedQuery(null);
          setMessages([]);
          setResolutionNote("");
          return;
        }

        if (selectedId && !list.some((item) => item.id === selectedId)) {
          setSelectedId(null);
          setSelectedQuery(null);
          setMessages([]);
          setResolutionNote("");
        }
      } catch (error) {
        onToast({
          type: "error",
          msg: error?.response?.data?.message || error?.message || "Failed to load support queue.",
        });
      } finally {
        setLoading(false);
      }
    },
    [onToast, search, selectedId, statusFilter, user]
  );

  const fetchThread = useCallback(
    async (queryId) => {
      if (!queryId) return;
      setThreadLoading(true);
      try {
        const [queryRes, messageRes] = await Promise.all([
          api.get(`/employee-queries/${queryId}`),
          api.get(`/employee-queries/${queryId}/messages`),
        ]);
        const query = queryRes.data?.data || null;
        setSelectedQuery(query);
        setMessages(Array.isArray(messageRes.data?.data) ? messageRes.data.data : []);
        setResolutionNote(query?.resolution_note || "");
      } catch (error) {
        onToast({
          type: "error",
          msg: error?.response?.data?.message || error?.message || "Failed to load thread.",
        });
      } finally {
        setThreadLoading(false);
      }
    },
    [onToast]
  );

  useEffect(() => {
    fetchQueries();
  }, [fetchQueries]);

  useEffect(() => {
    if (!selectedId) return;
    fetchThread(selectedId);
  }, [selectedId, fetchThread]);

  const handleOpenThread = useCallback((id) => {
    setSelectedId(id);
    setSelectedQuery(null);
    setMessages([]);
    setReply("");
  }, []);

  const handleBackToList = useCallback(async () => {
    setSelectedId(null);
    setSelectedQuery(null);
    setMessages([]);
    setReply("");
    await fetchQueries({ silent: true });
  }, [fetchQueries]);

  const sendReply = useCallback(async () => {
    if (!selectedId || !reply.trim()) return;
    setWorking(true);
    try {
      await api.post(`/employee-queries/${selectedId}/messages`, { message: reply.trim() });
      setReply("");
      await fetchQueries({ silent: true });
      await fetchThread(selectedId);
    } catch (error) {
      onToast({
        type: "error",
        msg: error?.response?.data?.message || error?.message || "Failed to send reply.",
      });
    } finally {
      setWorking(false);
    }
  }, [fetchQueries, fetchThread, onToast, reply, selectedId]);

  const patchQuery = useCallback(
    async (payload, successText) => {
      if (!selectedId) return;
      setWorking(true);
      try {
        await api.patch(`/employee-queries/${selectedId}`, payload);
        await fetchQueries({ silent: true });
        await fetchThread(selectedId);
        onToast({ type: "success", msg: successText });
      } catch (error) {
        onToast({
          type: "error",
          msg: error?.response?.data?.message || error?.message || "Failed to update query.",
        });
      } finally {
        setWorking(false);
      }
    },
    [fetchQueries, fetchThread, onToast, selectedId]
  );

  if (!selectedId) {
    return (
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Employee Queries</Text>
          <Text style={styles.panelCount}>{loading ? "..." : `${totalQueries} chats`}</Text>
        </View>

        <View style={styles.searchBox}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search employee or subject"
            placeholderTextColor="#64748B"
            style={styles.searchInput}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {SUPERADMIN_STATUS_FILTERS.map((item) => {
            const active = item.key === statusFilter;
            return (
              <Pressable
                key={item.key || "ALL"}
                onPress={() => setStatusFilter(item.key)}
                style={[styles.filterChip, active && styles.filterChipActive]}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 28 }} color="#38BDF8" />
        ) : queries.length ? (
          <View style={styles.queryList}>
            {queries.map((item) => (
              <QueryListRow key={item.id} item={item} onPress={() => handleOpenThread(item.id)} />
            ))}
          </View>
        ) : (
          <SupportEmptyCard
            title="No queries found"
            subtitle="Try another filter or wait for employees to raise new issues."
            icon={MessageSquareMore}
          />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.chatScreen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <View style={styles.chatHeader}>
        <Pressable onPress={handleBackToList} style={styles.backButton}>
          <ArrowLeft size={18} color="#E2E8F0" />
        </Pressable>

        <View style={styles.chatHeaderBody}>
          <Text numberOfLines={1} style={styles.chatHeaderName}>
            {selectedQuery?.employee_name || selectedListItem?.employee_name || "Employee"}
          </Text>
          <Text numberOfLines={1} style={styles.chatHeaderSub}>
            {selectedQuery?.subject || selectedListItem?.subject || "Query chat"}
          </Text>
        </View>

        <SupportStatusBadge status={selectedQuery?.status || selectedListItem?.status} />
      </View>

      <View style={styles.chatPanel}>
        {threadLoading || !selectedQuery ? (
          <ActivityIndicator style={{ marginTop: 28 }} color="#38BDF8" />
        ) : (
          <>
            <View style={styles.threadInfo}>
              <Text style={styles.threadInfoMeta}>
                {selectedQuery.employee_name || "Employee"} • {selectedQuery.emp_id || "No ID"}
              </Text>
              <Text style={styles.threadInfoMeta}>
                Started {formatDateTime(selectedQuery.created_at)}
              </Text>
            </View>

            <View style={styles.actionRow}>
              {/* <Pressable
                onPress={() => patchQuery({ assigned_to: user.id, status: "IN_PROGRESS" }, "Query assigned to you.")}
                disabled={working}
                style={[styles.actionButton, working && styles.buttonDisabled]}
              >
                <UserCheck size={15} color="#CFFAFE" />
                <Text style={styles.actionButtonText}>Take</Text>
              </Pressable> */}

              {/* <Pressable
                onPress={() => patchQuery({ status: "WAITING_FOR_EMPLOYEE" }, "Marked as waiting.")}
                disabled={working}
                style={[styles.actionButton, working && styles.buttonDisabled]}
              >
                <Clock3 size={15} color="#DBEAFE" />
                <Text style={styles.actionButtonText}>Wait</Text>
              </Pressable> */}

              <Pressable
                onPress={() =>
                  patchQuery(
                    { status: "RESOLVED", resolution_note: resolutionNote.trim() || undefined },
                    "Query resolved."
                  )
                }
                disabled={working}
                style={[styles.resolveButton, working && styles.buttonDisabled]}
              >
                <CheckCheck size={15} color="#052E16" />
                <Text style={styles.resolveButtonText}>Resolve</Text>
              </Pressable>
            </View>

            <View style={styles.noteBox}>
              <ShieldAlert size={14} color="#A5F3FC" />
              <TextInput
                value={resolutionNote}
                onChangeText={setResolutionNote}
                placeholder="Short resolution note"
                placeholderTextColor="#64748B"
                style={styles.noteInput}
              />
            </View>

            <ScrollView
              style={styles.messagesScroll}
              contentContainerStyle={[
                styles.chatContent,
                { paddingBottom: Math.max(insets.bottom, 16) },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <SupportChatBubble
                mine={false}
                sender={selectedQuery.employee_name || "Employee"}
                time={formatDateTime(selectedQuery.created_at)}
                message={selectedQuery.description}
              />
              {messages.map((message) => (
                <SupportChatBubble
                  key={message.id}
                  mine={Number(message.sender_user_id) === Number(user?.id)}
                  sender={message.sender_name || "User"}
                  time={formatDateTime(message.created_at)}
                  message={message.message}
                />
              ))}
            </ScrollView>

            <View style={[styles.replyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              <TextInput
                value={reply}
                onChangeText={setReply}
                placeholder="Reply to employee..."
                placeholderTextColor="#64748B"
                multiline
                style={styles.replyInput}
              />
              <Pressable
                onPress={sendReply}
                disabled={working || !reply.trim()}
                style={[styles.sendButton, (working || !reply.trim()) && styles.buttonDisabled]}
              >
                {working ? <ActivityIndicator color="#031525" /> : <Send size={17} color="#031525" />}
              </Pressable>
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#0b1728",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    padding: 14,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  panelTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
  },
  panelCount: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "600",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    backgroundColor: "#12253d",
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginTop: 12,
  },
  searchInput: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 13,
  },
  filterRow: {
    gap: 10,
    paddingTop: 10,
    paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#12253d",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
  },
  filterChipActive: {
    backgroundColor: "#67E8F9",
    borderColor: "#67E8F9",
  },
  filterChipText: {
    color: "#CBD5E1",
    fontWeight: "700",
    fontSize: 12,
  },
  filterChipTextActive: {
    color: "#031525",
  },
  queryList: {
    paddingTop: 12,
  },
  queryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.08)",
  },
  avatarWrap: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#12253d",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#F8FAFC",
    fontWeight: "900",
    fontSize: 16,
  },
  queryBody: {
    flex: 1,
    minWidth: 0,
  },
  queryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  queryName: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
  },
  queryTime: {
    maxWidth: 120,
    color: "#64748B",
    fontSize: 10,
    textAlign: "right",
  },
  querySubject: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  queryBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
  },
  querySnippet: {
    flex: 1,
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
  },
  chatScreen: {
    flex: 1,
    gap: 12,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0b1728",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    padding: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#12253d",
  },
  chatHeaderBody: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderName: {
    color: "#F8FAFC",
    fontSize: 15,
    fontWeight: "900",
  },
  chatHeaderSub: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 3,
  },
  chatPanel: {
    flex: 1,
    minHeight: 0,
    backgroundColor: "#0b1728",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    overflow: "hidden",
  },
  threadInfo: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  threadInfoMeta: {
    color: "#94A3B8",
    fontSize: 12,
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#112037",
    borderRadius: 16,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.12)",
  },
  actionButtonText: {
    color: "#CFFAFE",
    fontSize: 12,
    fontWeight: "800",
  },
  resolveButton: {
    flex: 1.15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#34D399",
    borderRadius: 16,
    paddingVertical: 11,
  },
  resolveButtonText: {
    color: "#052E16",
    fontSize: 12,
    fontWeight: "900",
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#101d30",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.1)",
    marginHorizontal: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  noteInput: {
    flex: 1,
    color: "#F8FAFC",
    fontSize: 13,
    paddingVertical: 2,
  },
  messagesScroll: {
    flex: 1,
    minHeight: 0,
  },
  chatContent: {
    padding: 14,
    gap: 12,
    flexGrow: 1,
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.08)",
    padding: 12,
    backgroundColor: "#0a1524",
  },
  replyInput: {
    flex: 1,
    minHeight: 50,
    maxHeight: 120,
    borderRadius: 18,
    backgroundColor: "#101d30",
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.08)",
    color: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#67E8F9",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
