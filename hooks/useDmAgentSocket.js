'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * @typedef {'connecting'|'ready'|'context_sent'|'error'|'closed'} ConnectionStatus
 */

/**
 * @typedef {Object} DmAgentTaskPayload
 * @property {string} name
 * @property {string} description
 * @property {string} type
 * @property {string[]} tags
 * @property {string|null} project_id
 * @property {string} priority
 * @property {number} point
 * @property {string|null} start_datetime
 * @property {string|null} end_datetime
 */

/**
 * @typedef {Object} DmAgentResponse
 * @property {string} message
 * @property {DmAgentTaskPayload|null} task
 * @property {boolean|null} approved
 * @property {number} receivedAt
 * @property {string} raw
 */

/**
 * @typedef {Object} DmAgentContextPayload
 * @property {string} username
 * @property {Array<Record<string, any>>} tasks_data
 * @property {Array<Record<string, any>>} projects_data
 * @property {string[]} task_types
 */

/**
 * React hook to manage connection to DM-Agent websocket.
 * Simple version: connects once when contextPayload is provided.
 *
 * @param {DmAgentContextPayload|null|undefined} contextPayload
 * @param {Object} [options]
 * @param {Array} [options.initialMessages=[]] - Initial messages from storage
 * @returns {{connectionStatus: ConnectionStatus, error: string|null, messages: DmAgentResponse[], latestMessage: DmAgentResponse|null, sendMessage: (text:string)=>void, close: ()=>void, reconnect: ()=>void}}
 */
export default function useDmAgentSocket(contextPayload, options = {}) {
  const { initialMessages = [] } = options;
  const SOCKET_URL = 'wss://dm-agent.talab304.online/agent/chat';

  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState(initialMessages);

  const socketRef = useRef(null);
  const shouldReconnectRef = useRef(true);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef(undefined);

  const pendingContextRef = useRef(null);
  const hasSentContextRef = useRef(false);
  const hasConnectedRef = useRef(false);

  const isBrowser = typeof window !== 'undefined';
  const initializedRef = useRef(false);

  // Update messages when initialMessages changes (for restoring from storage)
  useEffect(() => {
    if (!initializedRef.current && initialMessages.length > 0) {
      setMessages(initialMessages);
      initializedRef.current = true;
    }
  }, [initialMessages]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutRef.current !== undefined) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, []);

  const updateError = useCallback((msg) => {
    setError(String(msg));
    setConnectionStatus('error');
  }, []);

  const parseServerPayload = useCallback((raw) => {
    let parsed = raw;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      updateError('Cannot parse server response as JSON.');
      return null;
    }

    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) {
        updateError('Nested JSON in server response is invalid.');
        return null;
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      updateError('Server response is not an object.');
      return null;
    }

    const message = typeof parsed.message === 'string' ? parsed.message : '';
    const task = parsed.task && typeof parsed.task === 'object' ? parsed.task : null;
    const approved = parsed.approved === undefined || parsed.approved === null ? null : Boolean(parsed.approved);

    if (!message) {
      updateError('Agent response missing "message" field.');
      return null;
    }

    console.log('🔍 [DM-Agent] Parsed message:', { message, hasTask: !!task, approved, task });

    return {
      message,
      task,
      approved,
      receivedAt: Date.now(),
      raw,
    };
  }, [updateError]);

  // Store connect function in ref to avoid recreating it
  const connectFnRef = useRef(null);

  // Create connect function once
  if (!connectFnRef.current) {
    connectFnRef.current = () => {
      if (!isBrowser) {
        updateError('WebSocket only works in browser environment.');
        return;
      }

      clearReconnectTimer();

      try {
        setConnectionStatus('connecting');
        const socket = new WebSocket(SOCKET_URL);
        socketRef.current = socket;

        socket.onopen = () => {
          console.log('✅ [DM-Agent] WebSocket connected');
          setConnectionStatus('ready');
          setError(null);
          reconnectCountRef.current = 0;

          if (pendingContextRef.current && !hasSentContextRef.current) {
            try {
              console.log('📤 [DM-Agent] Sending context payload:', pendingContextRef.current);
              socket.send(JSON.stringify(pendingContextRef.current));
              hasSentContextRef.current = true;
              console.log('✅ [DM-Agent] Context payload sent successfully');
            } catch (err) {
              console.error('❌ [DM-Agent] Failed to send context:', err);
              updateError('Failed to send initial context payload.');
            }
          }
        };

        socket.onmessage = (event) => {
          const text = typeof event.data === 'string' ? event.data : String(event.data);
          console.log('📨 [DM-Agent] Received message:', text);

          // detect explicit status success message
          if (text === '{"status":"successful"}' || text === '{"status":"success"}') {
            console.log('✅ [DM-Agent] Context accepted by server');
            setConnectionStatus('context_sent');
            setError(null);
            return;
          }

          if (text.includes('"status"') && text.includes('successful')) {
            try {
              const statusPayload = JSON.parse(text);
              if (statusPayload.status === 'successful' || statusPayload.status === 'success') {
                setConnectionStatus('context_sent');
                setError(null);
                return;
              }
            } catch (e) {
              // fallthrough to regular parsing
            }
          }

          const parsed = parseServerPayload(text);
          if (parsed) {
            setMessages((prev) => [...prev, parsed]);
          }
        };

        socket.onerror = (error) => {
          console.error('❌ [DM-Agent] WebSocket error:', error);
          updateError('WebSocket error occurred.');
        };

        socket.onclose = (event) => {
          console.log('❌ [DM-Agent] WebSocket closed. Code:', event.code, 'Reason:', event.reason);
          hasSentContextRef.current = false;
          socketRef.current = null;
          setConnectionStatus('closed');
          // Auto-reconnect removed for simplicity - use manual reconnect button instead
        };
      } catch (e) {
        updateError('Failed to initialize WebSocket.');
      }
    };
  }

  const connect = connectFnRef.current;

  // Respond to context availability by connecting or resetting state.
  useEffect(() => {
    pendingContextRef.current = contextPayload ?? null;
    
    if (!contextPayload) {
      shouldReconnectRef.current = false;
      clearReconnectTimer();
      hasConnectedRef.current = false; // Reset on context clear
      if (socketRef.current) {
        try { socketRef.current.close(); } catch (e) { /* ignore */ }
        socketRef.current = null;
      }
      setConnectionStatus('connecting');
      return;
    }

    shouldReconnectRef.current = true;

    const socket = socketRef.current;
    const isSocketActive = socket && (socket.readyState === WebSocket.CONNECTING || socket.readyState === WebSocket.OPEN);
    
    // Only connect once when contextPayload first becomes available
    // Don't reconnect on subsequent contextPayload changes (unless socket is closed)
    if (!isSocketActive && !hasConnectedRef.current && connect) {
      hasConnectedRef.current = true;
      connect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextPayload]);

  // Cleanup on component unmount.
  useEffect(() => () => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current !== undefined) {
      window.clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) { /* ignore */ }
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((text) => {
    if (!text || !String(text).trim()) return;
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      updateError('WebSocket is not open.');
      return;
    }

    if (connectionStatus !== 'context_sent') {
      updateError('Context must be sent before sending messages.');
      return;
    }

    try {
      socketRef.current.send(text);
    } catch (e) {
      updateError('Failed to send message to agent.');
    }
  }, [connectionStatus, updateError]);

  const close = useCallback(() => {
    shouldReconnectRef.current = false;
    if (reconnectTimeoutRef.current !== undefined) {
      window.clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) { /* ignore */ }
      socketRef.current = null;
    }
    setConnectionStatus('closed');
  }, []);

  const latestMessage = useMemo(() => (messages.length ? messages[messages.length - 1] : null), [messages]);

  const reconnectSocket = useCallback(() => {
    
    if (!pendingContextRef.current) {
      updateError('Không có dữ liệu ngữ cảnh để kết nối lại.');
      return;
    }

    shouldReconnectRef.current = true;
    clearReconnectTimer();
    hasConnectedRef.current = false; // Reset to allow reconnection

    if (reconnectTimeoutRef.current !== undefined) {
      window.clearTimeout(reconnectTimeoutRef.current);
    }

    if (socketRef.current) {
      try { socketRef.current.close(); } catch (e) { /* ignore */ }
      socketRef.current = null;
    }

    if (connectFnRef.current) {
      connectFnRef.current();
    }
  }, [clearReconnectTimer, updateError]);

  return {
    connectionStatus,
    error,
    messages,
    latestMessage,
    sendMessage,
    close,
    reconnect: reconnectSocket,
  };
}
