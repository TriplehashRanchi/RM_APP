import {
  ArrowLeft,
  MessageCircleMore,
  Plus,
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
import { formatDateTime, getQueryStatusTone, QUERY_ACTIVE_STATUSES } from "../utils.js";
import EmployeeQueryComposerModal from "./EmployeeQueryComposerModal.jsx";

function sortQueries(list) {
  return [...list].sort(
    (a, b) =>
      new Date(b.updated_at || b.created_at || 0).getTime() -
      new Date(a.updated_at || a.created_at || 0).getTime()
  );
}

function QueryListRow({ item, onPress }) {
  const initial = String(item.subject || "Q").charAt(0).toUpperCase();
  const preview = item.description || "No message yet";

  return (
    <Pressable onPress={onPress} style={styles.queryRow}>
      <View style={styles.avatarWrap}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      <View style={styles.queryBody}>
        <View style={styles.queryTopRow}>
          <Text numberOfLines={1} style={styles.queryName}>
            {item.subject || "Untitled query"}
          </Text>
          <Text numberOfLines={1} style={styles.queryTime}>
            {formatDateTime(item.updated_at || item.created_at)}
          </Text>
        </View>

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

export default function EmployeeQuerySection({ user, employeeId, onToast }) {
  const insets = useSafeAreaInsets();
  const [queries, setQueries] = useState([]);
  const [selectedQueryId, setSelectedQueryId] = useState(null);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [messages, setMessages] = useState([]);
  const [queryLoading, setQueryLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [queryModalOpen, setQueryModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [draft, setDraft] = useState({ subject: "", message: "" });
  const [reply, setReply] = useState("");

  const activeQueryCount = useMemo(
    () => queries.filter((item) => QUERY_ACTIVE_STATUSES.includes(String(item.status || "").toUpperCase())).length,
    [queries]
  );

  const selectedListItem = useMemo(
    () => queries.find((item) => item.id === selectedQueryId) || null,
    [queries, selectedQueryId]
  );

  const fetchQueries = useCallback(
    async ({ silent = false } = {}) => {
      if (!employeeId) {
        setQueryLoading(false);
        return;
      }

      if (!silent) setQueryLoading(true);
      if (silent) setRefreshing(true);

      try {
        const res = await api.get("/employee-queries");
        const list = sortQueries(Array.isArray(res.data?.data) ? res.data.data : []);
        setQueries(list);

        if (!list.length) {
          setSelectedQueryId(null);
          setSelectedQuery(null);
          setMessages([]);
          return;
        }

        if (selectedQueryId && !list.some((item) => item.id === selectedQueryId)) {
          setSelectedQueryId(null);
          setSelectedQuery(null);
          setMessages([]);
        }
      } catch (error) {
        onToast({
          type: "error",
          msg: error?.response?.data?.message || error?.message || "Failed to load queries.",
        });
      } finally {
        setQueryLoading(false);
        setRefreshing(false);
      }
    },
    [employeeId, onToast, selectedQueryId]
  );

  const fetchThread = useCallback(
    async (queryId) => {
      if (!queryId) return;
      setThreadLoading(true);
      try {
        const [queryRes, messagesRes] = await Promise.all([
          api.get(`/employee-queries/${queryId}`),
          api.get(`/employee-queries/${queryId}/messages`),
        ]);
        setSelectedQuery(queryRes.data?.data || null);
        setMessages(Array.isArray(messagesRes.data?.data) ? messagesRes.data.data : []);
      } catch (error) {
        onToast({
          type: "error",
          msg: error?.response?.data?.message || error?.message || "Failed to load conversation.",
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
    if (!selectedQueryId) return;
    fetchThread(selectedQueryId);
  }, [selectedQueryId, fetchThread]);

  const handleOpenThread = useCallback((id) => {
    setSelectedQueryId(id);
    setSelectedQuery(null);
    setMessages([]);
    setReply("");
  }, []);

  const handleBackToList = useCallback(async () => {
    setSelectedQueryId(null);
    setSelectedQuery(null);
    setMessages([]);
    setReply("");
    await fetchQueries({ silent: true });
  }, [fetchQueries]);

  const submitQuery = useCallback(async () => {
    if (!employeeId) {
      onToast({ type: "error", msg: "Employee profile is not linked." });
      return;
    }
    if (!draft.subject.trim() || !draft.message.trim()) {
      onToast({ type: "error", msg: "Add a subject and message." });
      return;
    }

    setCreating(true);
    try {
      await api.post("/employee-queries", {
        employee_id: employeeId,
        category: "OTHER",
        priority: "MEDIUM",
        subject: draft.subject.trim(),
        description: draft.message.trim(),
      });
      setDraft({ subject: "", message: "" });
      setQueryModalOpen(false);
      await fetchQueries({ silent: true });
      onToast({ type: "success", msg: "New query raised." });
    } catch (error) {
      onToast({
        type: "error",
        msg: error?.response?.data?.message || error?.message || "Failed to raise query.",
      });
    } finally {
      setCreating(false);
    }
  }, [draft, employeeId, fetchQueries, onToast]);

  const sendReply = useCallback(async () => {
    if (!selectedQueryId || !reply.trim()) return;
    setSendingReply(true);
    try {
      await api.post(`/employee-queries/${selectedQueryId}/messages`, {
        message: reply.trim(),
      });
      setReply("");
      await fetchQueries({ silent: true });
      await fetchThread(selectedQueryId);
    } catch (error) {
      onToast({
        type: "error",
        msg: error?.response?.data?.message || error?.message || "Failed to send reply.",
      });
    } finally {
      setSendingReply(false);
    }
  }, [fetchQueries, fetchThread, onToast, reply, selectedQueryId]);

  const isLocked = ["CLOSED", "REJECTED"].includes(String(selectedQuery?.status || "").toUpperCase());

  if (!selectedQueryId) {
    return (
      <>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.topTitle}>Support Inbox</Text>
            <Text style={styles.topSubtitle}>Your queries stay in a clean list. Open any one when needed.</Text>
          </View>
          <Pressable onPress={() => setQueryModalOpen(true)} style={styles.topAction}>
            <Plus size={18} color="#020617" />
            <Text style={styles.topActionText}>Raise Query</Text>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Open</Text>
              <Text style={styles.statValue}>{queryLoading ? "..." : activeQueryCount}</Text>
            </View>
            {/* <Pressable onPress={() => fetchQueries({ silent: true })} style={styles.refreshButton}>
              <RefreshCcw size={15} color="#E2E8F0" />
              <Text style={styles.refreshText}>{refreshing ? "Refreshing" : "Refresh"}</Text>
            </Pressable> */}
          </View>
        </View>

        {!employeeId ? (
          <View style={styles.warningCard}>
            <ShieldAlert size={18} color="#FBBF24" />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>Employee mapping missing</Text>
              <Text style={styles.warningText}>Ask admin to link your login with an employee profile before raising queries.</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>Raised Queries</Text>
              <Text style={styles.sectionSubtitle}>Tap any thread to open the full chat.</Text>
            </View>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>{queries.length}</Text>
            </View>
          </View>

          {queryLoading ? (
            <ActivityIndicator style={{ marginTop: 20 }} color="#38BDF8" />
          ) : queries.length ? (
            <View style={styles.queryList}>
              {queries.map((item) => (
                <QueryListRow key={item.id} item={item} onPress={() => handleOpenThread(item.id)} />
              ))}
            </View>
          ) : (
            <SupportEmptyCard
              title="No queries yet"
              subtitle="Use Raise Query to open your first support thread."
              icon={MessageCircleMore}
            />
          )}
        </View>

        <EmployeeQueryComposerModal
          visible={queryModalOpen}
          onClose={() => setQueryModalOpen(false)}
          draft={draft}
          setDraft={setDraft}
          onSubmit={submitQuery}
          creating={creating}
        />
      </>
    );
  }

  return (
    <>
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
              {selectedQuery?.subject || selectedListItem?.subject || "Query chat"}
            </Text>
            <Text numberOfLines={1} style={styles.chatHeaderSub}>
              {selectedQuery?.status || selectedListItem?.status || "Thread"}
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
                <Text style={styles.threadInfoMeta}>Raised {formatDateTime(selectedQuery.created_at)}</Text>
              </View>

              {!!selectedQuery.resolution_note && (
                <View style={styles.resolutionBox}>
                  <Text style={styles.resolutionTitle}>Resolution Note</Text>
                  <Text style={styles.resolutionText}>{selectedQuery.resolution_note}</Text>
                </View>
              )}

              <ScrollView
                style={styles.messagesScroll}
                contentContainerStyle={[
                  styles.chatContent,
                  { paddingBottom: Math.max(insets.bottom, 16) },
                ]}
                showsVerticalScrollIndicator={false}
              >
                <SupportChatBubble
                  mine
                  sender={user?.name || "You"}
                  time={formatDateTime(selectedQuery.created_at)}
                  message={selectedQuery.description}
                />
                {messages.map((message) => (
                  <SupportChatBubble
                    key={message.id}
                    mine={Number(message.sender_user_id) === Number(user?.id)}
                    sender={message.sender_name || "Admin"}
                    time={formatDateTime(message.created_at)}
                    message={message.message}
                  />
                ))}
              </ScrollView>

              {isLocked ? (
                <View style={styles.lockNote}>
                  <ShieldAlert size={15} color="#FDE68A" />
                  <Text style={styles.lockNoteText}>
                    This thread is {String(getQueryStatusTone(selectedQuery.status).label).toLowerCase()}.
                  </Text>
                </View>
              ) : null}

              <View style={[styles.replyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TextInput
                  value={reply}
                  onChangeText={setReply}
                  placeholder={isLocked ? "This thread is locked" : "Reply in this thread..."}
                  placeholderTextColor="#64748B"
                  editable={!isLocked}
                  multiline
                  style={styles.replyInput}
                />
                <Pressable
                  onPress={sendReply}
                  disabled={sendingReply || isLocked || !reply.trim()}
                  style={[styles.sendButton, (sendingReply || isLocked || !reply.trim()) && styles.buttonDisabled]}
                >
                  {sendingReply ? <ActivityIndicator color="#031525" /> : <Send size={17} color="#031525" />}
                </Pressable>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>

      <EmployeeQueryComposerModal
        visible={queryModalOpen}
        onClose={() => setQueryModalOpen(false)}
        draft={draft}
        setDraft={setDraft}
        onSubmit={submitQuery}
        creating={creating}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  topTitle: {
    color: "#F8FAFC",
    fontSize: 21,
    fontWeight: "900",
  },
  topSubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 240,
  },
  topAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#67E8F9",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
  },
  topActionText: {
    color: "#020617",
    fontSize: 13,
    fontWeight: "800",
  },
  hero: {
    backgroundColor: "#0d1d33",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(103, 232, 249, 0.16)",
    padding: 14,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#13263f",
    borderRadius: 18,
    paddingHorizontal: 15,
    paddingVertical: 13,
  },
  statLabel: {
    color: "#7DD3FC",
    fontSize: 11,
    textTransform: "uppercase",
    fontWeight: "800",
  },
  statValue: {
    color: "#F8FAFC",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 6,
  },
  refreshButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#13263f",
  },
  refreshText: {
    color: "#E2E8F0",
    fontWeight: "700",
  },
  warningCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 20,
    padding: 15,
    backgroundColor: "rgba(251, 191, 36, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.18)",
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    color: "#FEF3C7",
    fontSize: 14,
    fontWeight: "800",
  },
  warningText: {
    color: "#FDE68A",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: "#0b1728",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    padding: 14,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 4,
  },
  countPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#16263d",
    alignItems: "center",
    justifyContent: "center",
  },
  countPillText: {
    color: "#E2E8F0",
    fontWeight: "800",
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
    width: 48,
    height: 48,
    borderRadius: 24,
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
    gap: 12,
    backgroundColor: "#0b1728",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.12)",
    padding: 12,
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
  resolutionBox: {
    backgroundColor: "rgba(52, 211, 153, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.18)",
    padding: 14,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 10,
  },
  resolutionTitle: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  resolutionText: {
    color: "#D1FAE5",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
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
  lockNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  lockNoteText: {
    color: "#FDE68A",
    fontSize: 12,
    fontWeight: "700",
  },
  replyBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.08)",
    padding: 12,
    backgroundColor: "#0a1524",
  },
  replyInput: {
    flex: 1,
    minHeight: 50,
    maxHeight: 120,
    borderRadius: 18,
    backgroundColor: "#111f33",
    color: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.1)",
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
