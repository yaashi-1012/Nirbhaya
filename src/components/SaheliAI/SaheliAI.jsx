import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, User } from 'lucide-react';
import { auth } from '../../firebase';
import { getOrCreateConversation, sendMessageToFirestore, listenToChatMessages } from '../../utils/saheliChatService';
import './SaheliAI.css';

const SaheliAI = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const messagesEndRef = useRef(null);

    // Initial load: Auth listener & getting conversation ID
    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const convId = await getOrCreateConversation(user.uid);
                    setConversationId(convId);
                } catch (error) {
                    console.error("Error setting up conversation:", error);
                }
            } else {
                setConversationId(null);
                setIsOpen(false);
                setMessages([]);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Listen to messages when conversation ID is available
    useEffect(() => {
        let unsubscribeMessages = null;
        if (conversationId) {
            unsubscribeMessages = listenToChatMessages(conversationId, (fetchedMessages) => {
                setMessages(fetchedMessages);
                scrollToBottom();
            });
        }

        return () => {
            if (unsubscribeMessages) unsubscribeMessages();
        };
    }, [conversationId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        }, 100);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if (!inputText.trim() || !conversationId) return;

        const userMessage = inputText.trim();
        setInputText(''); // Clear input
        setIsLoading(true);

        try {
            // 1. Save user message to Firestore
            await sendMessageToFirestore(conversationId, 'user', userMessage);

            // 2. Prepare payload for Express API
            // Format existing messages for context (optional, but good for follow-ups)
            const apiMessages = messages.map(msg => ({
                role: msg.sender === 'bot' ? 'assistant' : 'user',
                content: msg.message
            }));

            // Add the new user message to the payload
            apiMessages.push({ role: 'user', content: userMessage });

            // 3. Send to API backend proxy (routed via Vite or Vercel)
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ messages: apiMessages }),
            });

            if (!response.ok) {
                throw new Error("Failed to get response from AI server");
            }

            const data = await response.json();

            // 4. Save bot response to Firestore
            await sendMessageToFirestore(conversationId, 'bot', data.reply);

        } catch (error) {
            console.error("Error sending message:", error);
            // Fallback error message stored straight to firestore so user sees it
            await sendMessageToFirestore(conversationId, 'bot', "I'm having a little trouble connecting right now. Please try again in a moment!");
        } finally {
            setIsLoading(false);
            scrollToBottom();
        }
    };

    // Don't render the floating button if not logged in
    if (!auth.currentUser) return null;

    return (
        <div className="saheli-container">
            {isOpen ? (
                <div className="saheli-chat-panel">
                    <div className="saheli-header">
                        <div className="saheli-header-title">
                            <span className="saheli-icon-wrap">🌷</span>
                            Saheli AI
                        </div>
                        <button className="saheli-close-btn" onClick={() => setIsOpen(false)}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="saheli-messages">
                        {messages.length === 0 && !isLoading && (
                            <div className="saheli-welcome">
                                Hi there! I'm Saheli. 👋 I can help you use the platform, find communities, or structure your stories. How can I help you today?
                            </div>
                        )}

                        {messages.map((msg) => (
                            <div key={msg.id} className={`saheli-message-row ${msg.sender === 'user' ? 'user-row' : 'bot-row'}`}>
                                {msg.sender === 'bot' && (
                                    <div className="saheli-avatar bot">🌷</div>
                                )}
                                <div className={`saheli-bubble ${msg.sender}`}>
                                    {msg.message}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="saheli-message-row bot-row">
                                <div className="saheli-avatar bot">🌷</div>
                                <div className="saheli-bubble bot loading-bubble">
                                    <div className="dot-typing"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="saheli-input-area">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Ask Saheli..."
                            className="saheli-input"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            className="saheli-send-btn"
                            disabled={!inputText.trim() || isLoading}
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            ) : (
                <button className="saheli-floating-btn tour-ai-chat" onClick={() => setIsOpen(true)}>
                    <MessageSquare size={20} />
                    <span>Ask Saheli</span>
                </button>
            )}
        </div>
    );
};

export default SaheliAI;
