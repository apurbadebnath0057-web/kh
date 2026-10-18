import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  addDoc 
} from 'firebase/firestore';
import { 
  Sparkles, MessageSquare, FileText, Image as ImageIcon, CreditCard, 
  ShieldAlert, LayoutDashboard, Users, Receipt, Settings, Code2, 
  Send, Copy, Check, Trash2, Download, Plus, Minus, Zap, Crown, 
  RefreshCw, Lock, Unlock, Search, CheckCircle2, XCircle, AlertTriangle, 
  QrCode, Smartphone, Globe, ArrowUpRight, Sliders, Eye, Terminal,
  History, Wand2, ChevronRight, IndianRupee, DollarSign, Ban, UserCheck
} from 'lucide-react';

// ==========================================
// 1. FIREBASE INITIALIZATION (RULE 1 & 3)
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "demo", authDomain: "demo.firebaseapp.com", projectId: "demo-project" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'nexus-ai-saas-v1';

// ==========================================
// 2. DEFAULT PLATFORM CONFIGURATION
// ==========================================
const DEFAULT_SETTINGS = {
  chatCost: 1,
  scriptCost: 2,
  imageCost: 5,
  chatEnabled: true,
  scriptEnabled: true,
  imageEnabled: true,
  defaultChatSystemPrompt: "You are NexusAI, an elite, concise, and helpful AI assistant. Provide well-structured, accurate answers using clean markdown formatting.",
  defaultScriptSystemPrompt: "You are a world-class viral content strategist, YouTube scriptwriter, and SEO copywriter. Write engaging, high-retention content with clear hooks, body sections, and calls to action.",
  adminPin: "1234"
};

const PERSONA_PRESETS = [
  { id: 'general', name: 'General Assistant', icon: '🤖', prompt: 'You are a helpful, clear, and intelligent AI assistant.' },
  { id: 'tech', name: 'Tech Reviewer', icon: '📱', prompt: 'You are a sharp, insightful tech reviewer and gadget analyst. Compare specs, pros/cons, and real-world value.' },
  { id: 'coder', name: 'Coding Expert', icon: '💻', prompt: 'You are a principal full-stack software engineer. Write clean, modern, production-ready code with brief explanations.' },
  { id: 'marketer', name: 'Marketing Strategist', icon: '📈', prompt: 'You are a direct-response growth marketer. Focus on conversion rates, viral hooks, and audience psychology.' }
];

const SCRIPT_TEMPLATES = [
  { id: 'yt_script', name: 'YouTube Video Script', desc: 'High-retention hook, intro, B-roll cues & outro', badge: 'Viral Video' },
  { id: 'tech_news', name: 'Tech News Roundup', desc: 'Fast-paced breakdown of latest tech launches', badge: 'News' },
  { id: 'seo_blog', name: 'SEO Blog Post', desc: 'Keyword-optimized article with H2/H3 headings', badge: 'SEO' },
  { id: 'social_hooks', name: '10 Viral Social Hooks', desc: 'Scroll-stopping hooks for Reels, Shorts & X', badge: 'Short-form' },
  { id: 'prod_review', name: 'In-Depth Product Review', desc: 'Unbiased pros, cons, verdict & buying advice', badge: 'Review' }
];

const IMAGE_STYLES = [
  { id: 'yt_thumb', name: 'YouTube Thumbnail', suffix: 'hyper-expressive YouTube thumbnail style, vibrant high contrast lighting, Rim lighting, 8k resolution, cinematic depth of field, ultra sharp' },
  { id: 'photoreal', name: 'Photorealistic 8K', suffix: 'award-winning photorealistic photography, shot on 35mm lens, f/1.8, natural lighting, ultra-detailed textures' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', suffix: 'futuristic cyberpunk city aesthetic, neon magenta and cyan reflections, rainy streets, volumetric fog, Unreal Engine 5 render' },
  { id: 'vintage', name: '90s Vintage Flash', suffix: '1990s disposable film camera aesthetic, direct harsh flash, subtle film grain, nostalgic warm color grading' },
  { id: 'studio_prod', name: 'Studio Product Shot', suffix: 'commercial luxury product photography, sleek studio pedestal, dramatic softbox lighting, minimalist background, 8k' }
];

const PLANS = [
  {
    id: 'Starter',
    name: 'Starter Free',
    inrPrice: 0,
    usdPrice: 0,
    credits: 25,
    badge: 'Default',
    features: ['25 Welcome Credits', 'Standard Gemini 3 Flash Chat', 'Basic Content Templates', 'Community Support']
  },
  {
    id: 'Pro Creator',
    name: 'Pro Creator',
    inrPrice: 499,
    usdPrice: 9,
    credits: 500,
    popular: true,
    badge: 'Most Popular',
    features: ['500 Monthly Credits', 'Unlimited Saved History', 'All Viral Script Templates', 'HD AI Image & Thumbnail Studio', 'Priority API Queue']
  },
  {
    id: 'Agency Unlimited',
    name: 'Agency Scale',
    inrPrice: 1999,
    usdPrice: 29,
    credits: 2500,
    badge: 'Best Value',
    features: ['2,500 Monthly Credits', 'Commercial Usage Rights', 'Custom System Personas', 'Bulk Content Generation', '24/7 Dedicated Support']
  }
];

const CREDIT_PACKS = [
  { id: 'pack_100', name: '100 Credit Booster', credits: 100, inrPrice: 149, usdPrice: 2.50, desc: 'Great for quick projects' },
  { id: 'pack_500', name: '500 Credit Power Pack', credits: 500, inrPrice: 499, usdPrice: 7.00, desc: 'Best for active creators' }
];

// ==========================================
// 3. GEMINI API HELPERS WITH BACKOFF
// ==========================================
async function fetchWithRetry(url, options, retries = 3) {
  let delay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return await res.json();
      const errData = await res.json().catch(() => ({}));
      if (res.status === 429 || res.status >= 500) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
        continue;
      }
      throw new Error(errData?.error?.message || `API Error (${res.status})`);
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

async function generateGeminiText(userPrompt, systemPrompt) {
  const apiKey = "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: userPrompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] }
  };
  const data = await fetchWithRetry(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text returned from Gemini API.");
  return text;
}

async function generateGeminiImage(promptText, aspectRatio = "16:9") {
  const apiKey = "";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ role: 'user', parts: [{ text: promptText }] }],
    generationConfig: {
      responseModalities: ['IMAGE'],
      imageConfig: { aspectRatio }
    }
  };
  const data = await fetchWithRetry(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const part = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
  if (!part) throw new Error("Image could not be generated. Try refining your prompt.");
  return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
}

// ==========================================
// 4. MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  // Auth & Firebase State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Portal Navigation: 'user' | 'admin'
  const [portalMode, setPortalMode] = useState('user');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(true); // Unlocked by default for demo convenience, lockable with PIN
  const [pinInput, setPinInput] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  // Sub-Navigation Tabs
  const [userTab, setUserTab] = useState('chat'); // 'chat' | 'script' | 'image' | 'history' | 'billing'
  const [adminTab, setAdminTab] = useState('dashboard'); // 'dashboard' | 'users' | 'transactions' | 'config' | 'backend_code'

  // Firestore Synchronized Collections
  const [allUsers, setAllUsers] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [allGenerations, setAllGenerations] = useState([]);
  const [platformSettings, setPlatformSettings] = useState(DEFAULT_SETTINGS);

  // Toast Notification State
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Copy Helper State
  const [copiedId, setCopiedId] = useState(null);
  const handleCopy = (text, id = 'temp') => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- AI Chat State ---
  const [chatPersona, setChatPersona] = useState(PERSONA_PRESETS[0]);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: "Hello! I'm **NexusAI**, your all-in-one AI assistant. Choose a persona above or ask me anything—from writing code and reviewing gadgets to planning your next YouTube video!" }
  ]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  // --- AI Script Studio State ---
  const [selectedTemplate, setSelectedTemplate] = useState(SCRIPT_TEMPLATES[0]);
  const [scriptTopic, setScriptTopic] = useState('');
  const [scriptTone, setScriptTone] = useState('Engaging & High-Energy');
  const [scriptWords, setScriptWords] = useState('600');
  const [scriptOutput, setScriptOutput] = useState('');
  const [isScriptLoading, setIsScriptLoading] = useState(false);

  // --- AI Image Studio State ---
  const [imagePrompt, setImagePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(IMAGE_STYLES[0]);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [isImageLoading, setIsImageLoading] = useState(false);

  // --- Payment & Checkout Modal State ---
  const [currency, setCurrency] = useState('INR'); // 'INR' | 'USD'
  const [checkoutItem, setCheckoutItem] = useState(null); // Plan or Pack object
  const [paymentGateway, setPaymentGateway] = useState('razorpay'); // 'razorpay' | 'stripe'
  const [paymentMethodType, setPaymentMethodType] = useState('upi'); // 'upi' | 'qr' | 'card'
  const [upiId, setUpiId] = useState('creator@okaxis');
  const [cardDetails, setCardDetails] = useState({ number: '4242 •••• •••• 4242', expiry: '08/29', cvc: '884', name: 'Alex Creator' });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [latestReceipt, setLatestReceipt] = useState(null);

  // --- Admin Panel Local Inputs ---
  const [adminUserSearch, setAdminUserSearch] = useState('');
  const [creditAdjustMap, setCreditAdjustMap] = useState({});
  const [configDraft, setConfigDraft] = useState(DEFAULT_SETTINGS);

  // ==========================================
  // 5. FIREBASE AUTH & REAL-TIME LISTENERS
  // ==========================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. Ensure Current User Profile Exists in Public Users Collection (so Admin Panel can manage all users)
    const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
    getDoc(userDocRef).then((snap) => {
      if (!snap.exists()) {
        setDoc(userDocRef, {
          uid: user.uid,
          name: `Creator #${user.uid.slice(0, 5).toUpperCase()}`,
          email: `creator.${user.uid.slice(0, 5).toLowerCase()}@nexusai.app`,
          credits: 25,
          plan: 'Starter',
          status: 'Active',
          totalSpentINR: 0,
          generationsCount: 0,
          joinedAt: new Date().toISOString()
        }).catch(e => console.error("Error creating user doc:", e));
      }
    });

    // 2. Ensure Global Platform Settings Exist
    const settingsDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global');
    getDoc(settingsDocRef).then((snap) => {
      if (!snap.exists()) {
        setDoc(settingsDocRef, DEFAULT_SETTINGS).catch(e => console.error("Settings init err:", e));
      }
    });

    // 3. Subscribe to Users Collection
    const unsubUsers = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'users'),
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0));
        setAllUsers(list);
      },
      (err) => console.error("Users listener error:", err)
    );

    // 4. Subscribe to Transactions Collection
    const unsubTx = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'transactions'),
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setAllTransactions(list);
      },
      (err) => console.error("Transactions listener error:", err)
    );

    // 5. Subscribe to Generations Collection
    const unsubGen = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'generations'),
      (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setAllGenerations(list);
      },
      (err) => console.error("Generations listener error:", err)
    );

    // 6. Subscribe to Global Settings
    const unsubSettings = onSnapshot(
      settingsDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = { ...DEFAULT_SETTINGS, ...snap.data() };
          setPlatformSettings(data);
          setConfigDraft(data);
        }
      },
      (err) => console.error("Settings listener error:", err)
    );

    return () => {
      unsubUsers();
      unsubTx();
      unsubGen();
      unsubSettings();
    };
  }, [user]);

  // Derived Current User Profile
  const currentUserProfile = useMemo(() => {
    if (!user) return null;
    return allUsers.find(u => u.uid === user.uid) || {
      uid: user.uid,
      name: `Creator #${user.uid.slice(0, 5).toUpperCase()}`,
      email: `creator.${user.uid.slice(0, 5).toLowerCase()}@nexusai.app`,
      credits: 25,
      plan: 'Starter',
      status: 'Active'
    };
  }, [user, allUsers]);

  // Derived Current User History
  const myGenerations = useMemo(() => {
    if (!user) return [];
    return allGenerations.filter(g => g.uid === user.uid);
  }, [user, allGenerations]);

  // ==========================================
  // 6. CREDIT DEDUCTION & LOGGING ENGINE
  // ==========================================
  const verifyAndDeductCredits = async (cost) => {
    if (!user || !currentUserProfile) return false;
    if (currentUserProfile.status === 'Banned') {
      showToast('Your account has been suspended by an administrator.', 'error');
      return false;
    }
    if ((currentUserProfile.credits || 0) < cost) {
      showToast(`Insufficient credits! You need ${cost} credits. Please top up.`, 'error');
      setUserTab('billing');
      return false;
    }
    const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
    await updateDoc(userRef, {
      credits: Math.max(0, (currentUserProfile.credits || 0) - cost),
      generationsCount: (currentUserProfile.generationsCount || 0) + 1
    });
    return true;
  };

  const saveGenerationRecord = async (type, title, prompt, output, cost) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'generations'), {
      uid: user.uid,
      userEmail: currentUserProfile?.email || 'user@nexusai.app',
      type, // 'chat' | 'script' | 'image'
      title,
      prompt,
      output,
      creditsUsed: cost,
      createdAt: new Date().toISOString()
    });
  };

  // ==========================================
  // 7. USER AI TOOL HANDLERS
  // ==========================================

  // A. AI Chat Handler
  const handleSendChat = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    if (!platformSettings.chatEnabled) {
      showToast('AI Chat is temporarily paused by Admin for maintenance.', 'error');
      return;
    }

    const cost = Number(platformSettings.chatCost) || 1;
    const canProceed = await verifyAndDeductCredits(cost);
    if (!canProceed) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const combinedSystemPrompt = `${platformSettings.defaultChatSystemPrompt}\n\nActive Persona: ${chatPersona.name} - ${chatPersona.prompt}`;
      const conversationContext = chatMessages
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
        .join('\n\n') + `\n\nUser: ${userMsg}`;

      const reply = await generateGeminiText(conversationContext, combinedSystemPrompt);
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
      await saveGenerationRecord('chat', `${chatPersona.name}: ${userMsg.slice(0, 40)}...`, userMsg, reply, cost);
    } catch (err) {
      showToast(err.message || 'Failed to generate AI response.', 'error');
      setChatMessages(prev => [...prev, { role: 'assistant', text: `⚠️ Error: ${err.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // B. AI Content & Script Studio Handler
  const handleGenerateScript = async (e) => {
    e?.preventDefault();
    if (!scriptTopic.trim() || isScriptLoading) return;
    if (!platformSettings.scriptEnabled) {
      showToast('AI Content Studio is currently under maintenance by Admin.', 'error');
      return;
    }

    const cost = Number(platformSettings.scriptCost) || 2;
    const canProceed = await verifyAndDeductCredits(cost);
    if (!canProceed) return;

    setIsScriptLoading(true);
    try {
      const prompt = `
Template Format: ${selectedTemplate.name} (${selectedTemplate.desc})
Topic / Title: ${scriptTopic}
Desired Tone: ${scriptTone}
Target Length: ~${scriptWords} words

Please generate a complete, structured, ready-to-publish ${selectedTemplate.name} with clear sections, magnetic hooks, and actionable takeaways.`;

      const result = await generateGeminiText(prompt, platformSettings.defaultScriptSystemPrompt);
      setScriptOutput(result);
      await saveGenerationRecord('script', `${selectedTemplate.name}: ${scriptTopic.slice(0, 40)}`, scriptTopic, result, cost);
      showToast(`${selectedTemplate.name} generated! (-${cost} credits)`, 'success');
    } catch (err) {
      showToast(err.message || 'Script generation failed.', 'error');
    } finally {
      setIsScriptLoading(false);
    }
  };

  // C. AI Image & Thumbnail Studio Handler
  const handleGenerateImage = async (e) => {
    e?.preventDefault();
    if (!imagePrompt.trim() || isImageLoading) return;
    if (!platformSettings.imageEnabled) {
      showToast('AI Image Studio is currently disabled by Admin.', 'error');
      return;
    }

    const cost = Number(platformSettings.imageCost) || 5;
    const canProceed = await verifyAndDeductCredits(cost);
    if (!canProceed) return;

    setIsImageLoading(true);
    try {
      const fullVisualPrompt = `${imagePrompt.trim()}, ${selectedStyle.suffix}`;
      const dataUrl = await generateGeminiImage(fullVisualPrompt, aspectRatio);
      setGeneratedImageUrl(dataUrl);
      // Save lightweight metadata in Firestore (avoiding 1MB doc limit while storing full session preview)
      await saveGenerationRecord(
        'image',
        `${selectedStyle.name} (${aspectRatio}): ${imagePrompt.slice(0, 35)}`,
        fullVisualPrompt,
        dataUrl.length < 750000 ? dataUrl : 'IMAGE_GENERATED_IN_SESSION',
        cost
      );
      showToast(`AI Masterpiece generated! (-${cost} credits)`, 'success');
    } catch (err) {
      showToast(err.message || 'Image generation failed.', 'error');
    } finally {
      setIsImageLoading(false);
    }
  };

  // ==========================================
  // 8. PAYMENT GATEWAY ENGINE (RAZORPAY / STRIPE)
  // ==========================================
  const openCheckout = (item, isSubscription = true) => {
    const amount = currency === 'INR' ? item.inrPrice : item.usdPrice;
    if (amount === 0) {
      showToast('You are already eligible for the Starter plan!', 'info');
      return;
    }
    setPaymentGateway(currency === 'INR' ? 'razorpay' : 'stripe');
    setCheckoutItem({ ...item, isSubscription, amount, currency });
  };

  const handleCompletePayment = async (e) => {
    e?.preventDefault();
    if (!checkoutItem || !user) return;

    setIsProcessingPayment(true);
    setTimeout(async () => {
      try {
        const txId = paymentGateway === 'razorpay'
          ? `pay_Rzp${Math.random().toString(36).substring(2, 10).toUpperCase()}`
          : `pi_Strp${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

        const orderId = `order_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
        const amountINR = checkoutItem.currency === 'INR'
          ? Number(checkoutItem.amount)
          : Math.round(Number(checkoutItem.amount) * 84);

        const txRecord = {
          txId,
          orderId,
          uid: user.uid,
          userName: currentUserProfile?.name || 'Creator',
          userEmail: currentUserProfile?.email || 'creator@nexusai.app',
          itemName: checkoutItem.name,
          isSubscription: checkoutItem.isSubscription,
          creditsAdded: checkoutItem.credits,
          amount: checkoutItem.amount,
          currency: checkoutItem.currency,
          amountINRNormalized: amountINR,
          gateway: paymentGateway === 'razorpay' ? 'Razorpay' : 'Stripe',
          method: paymentGateway === 'razorpay' ? paymentMethodType.toUpperCase() : 'CARD',
          status: 'Success',
          createdAt: new Date().toISOString()
        };

        // 1. Record Transaction in Firestore
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), txRecord);

        // 2. Upgrade User Credits & Plan in Firestore
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        const updatedFields = {
          credits: (currentUserProfile?.credits || 0) + Number(checkoutItem.credits),
          totalSpentINR: (currentUserProfile?.totalSpentINR || 0) + amountINR
        };
        if (checkoutItem.isSubscription) {
          updatedFields.plan = checkoutItem.id;
        }
        await updateDoc(userRef, updatedFields);

        setLatestReceipt(txRecord);
        setCheckoutItem(null);
        showToast(`Payment Successful! +${checkoutItem.credits} Credits added to your wallet.`, 'success');
      } catch (err) {
        showToast('Payment verification error: ' + err.message, 'error');
      } finally {
        setIsProcessingPayment(false);
      }
    }, 1400);
  };

  // ==========================================
  // 9. ADMIN PANEL MANAGEMENT HANDLERS
  // ==========================================
  const handleAdminAdjustCredits = async (targetUid, currentCredits, delta) => {
    const newCredits = Math.max(0, Number(currentCredits || 0) + Number(delta));
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', targetUid), {
      credits: newCredits
    });
    showToast(`Updated user balance to ${newCredits} credits.`, 'success');
  };

  const handleAdminChangePlan = async (targetUid, newPlan) => {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', targetUid), {
      plan: newPlan
    });
    showToast(`User plan changed to ${newPlan}.`, 'success');
  };

  const handleAdminToggleStatus = async (targetUid, currentStatus) => {
    const nextStatus = currentStatus === 'Banned' ? 'Active' : 'Banned';
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', targetUid), {
      status: nextStatus
    });
    showToast(`User account is now ${nextStatus}.`, nextStatus === 'Banned' ? 'error' : 'success');
  };

  const handleAdminRefundTransaction = async (tx) => {
    if (tx.status === 'Refunded') return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'transactions', tx.id), {
      status: 'Refunded'
    });
    // Also deduct credits from the user if they still exist
    const targetUser = allUsers.find(u => u.uid === tx.uid);
    if (targetUser) {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', tx.uid), {
        credits: Math.max(0, (targetUser.credits || 0) - (tx.creditsAdded || 0))
      });
    }
    showToast(`Transaction ${tx.txId} marked as Refunded & credits revoked.`, 'info');
  };

  const handleSaveGlobalConfig = async (e) => {
    e?.preventDefault();
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), configDraft);
    showToast('Global AI Tool & Pricing configuration saved in real-time!', 'success');
  };

  const handleSeedDemoData = async () => {
    if (!user) return;
    try {
      const demoUsers = [
        { uid: 'demo_u1', name: 'Rohan Sharma', email: 'rohan.tech@gmail.com', credits: 480, plan: 'Pro Creator', status: 'Active', totalSpentINR: 499, generationsCount: 19, joinedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
        { uid: 'demo_u2', name: 'Sarah Jenkins', email: 'sarah@growthagency.io', credits: 2390, plan: 'Agency Unlimited', status: 'Active', totalSpentINR: 2436, generationsCount: 64, joinedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { uid: 'demo_u3', name: 'Arjun Verma', email: 'arjun.vlogs@youtube.com', credits: 112, plan: 'Starter', status: 'Active', totalSpentINR: 149, generationsCount: 12, joinedAt: new Date(Date.now() - 86400000 * 1).toISOString() }
      ];
      for (const u of demoUsers) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.uid), u);
      }
      const demoTxs = [
        { txId: 'pay_Rzp9982KLM1', orderId: 'order_K912A', uid: 'demo_u1', userName: 'Rohan Sharma', userEmail: 'rohan.tech@gmail.com', itemName: 'Pro Creator', isSubscription: true, creditsAdded: 500, amount: 499, currency: 'INR', amountINRNormalized: 499, gateway: 'Razorpay', method: 'UPI', status: 'Success', createdAt: new Date(Date.now() - 86400000 * 4).toISOString() },
        { txId: 'pi_Strp7741XY9', orderId: 'order_S882B', uid: 'demo_u2', userName: 'Sarah Jenkins', userEmail: 'sarah@growthagency.io', itemName: 'Agency Scale', isSubscription: true, creditsAdded: 2500, amount: 29, currency: 'USD', amountINRNormalized: 2436, gateway: 'Stripe', method: 'CARD', status: 'Success', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
        { txId: 'pay_Rzp3310PQR8', orderId: 'order_M110C', uid: 'demo_u3', userName: 'Arjun Verma', userEmail: 'arjun.vlogs@youtube.com', itemName: '100 Credit Booster', isSubscription: false, creditsAdded: 100, amount: 149, currency: 'INR', amountINRNormalized: 149, gateway: 'Razorpay', method: 'QR', status: 'Success', createdAt: new Date(Date.now() - 3600000 * 6).toISOString() }
      ];
      for (const t of demoTxs) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'transactions'), t);
      }
      showToast('Sample SaaS users & payment logs seeded!', 'success');
    } catch (err) {
      showToast('Failed to seed sample data: ' + err.message, 'error');
    }
  };

  // ==========================================
  // 10. ADMIN ANALYTICS COMPUTATIONS
  // ==========================================
  const adminMetrics = useMemo(() => {
    const validTxs = allTransactions.filter(t => t.status === 'Success');
    const totalRevenueINR = validTxs.reduce((acc, t) => acc + (Number(t.amountINRNormalized) || 0), 0);
    const paidSubscribers = allUsers.filter(u => u.plan !== 'Starter').length;
    const totalCreditsConsumed = allGenerations.reduce((acc, g) => acc + (Number(g.creditsUsed) || 0), 0);
    const chatCount = allGenerations.filter(g => g.type === 'chat').length;
    const scriptCount = allGenerations.filter(g => g.type === 'script').length;
    const imageCount = allGenerations.filter(g => g.type === 'image').length;

    return {
      totalRevenueINR,
      totalRevenueUSD: (totalRevenueINR / 84).toFixed(2),
      paidSubscribers,
      totalUsers: allUsers.length,
      totalGenerations: allGenerations.length,
      totalCreditsConsumed,
      chatCount,
      scriptCount,
      imageCount
    };
  }, [allTransactions, allUsers, allGenerations]);

  // Download Invoice Helper
  const downloadInvoiceText = (tx) => {
    const content = `
====================================================
              NEXUS AI SAAS - TAX INVOICE
====================================================
Invoice / Receipt ID : ${tx.txId}
Order Reference      : ${tx.orderId}
Date                 : ${new Date(tx.createdAt).toLocaleString()}
Payment Gateway      : ${tx.gateway} (${tx.method})
Status               : ${tx.status.toUpperCase()}
----------------------------------------------------
Customer Name        : ${tx.userName}
Customer Email       : ${tx.userEmail}
Customer UID         : ${tx.uid}
----------------------------------------------------
Item Purchased       : ${tx.itemName}
Credits Credited     : +${tx.creditsAdded} AI Credits
Amount Paid          : ${tx.currency === 'INR' ? '₹' : '$'}${tx.amount} ${tx.currency}
====================================================
Thank you for building with NexusAI Suite!
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${tx.txId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center animate-pulse">
          <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
        <p className="text-slate-400 text-sm font-medium tracking-wide">Initializing NexusAI Cloud & Payment Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* =========================================================
          GLOBAL TOP PORTAL SWITCHER BAR
      ========================================================= */}
      <header className="sticky top-0 z-40 h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
            portalMode === 'admin' 
              ? 'bg-gradient-to-br from-rose-500 to-orange-600 shadow-rose-500/20' 
              : 'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/20'
          }`}>
            {portalMode === 'admin' ? <ShieldAlert className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">NexusAI</span>
              <span className={`text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                portalMode === 'admin'
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
              }`}>
                {portalMode === 'admin' ? 'Admin Control Center' : `${currentUserProfile?.plan || 'Starter'} Workspace`}
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {portalMode === 'admin' 
                ? 'Separate Back-Office Management • Live Firestore & Gateway Control' 
                : 'All-in-One Gemini AI Suite • Chat, Scripts & Thumbnail Studio'}
            </p>
          </div>
        </div>

        {/* Center Portal Switcher Pill */}
        <div className="flex items-center bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setPortalMode('user')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              portalMode === 'user'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>User AI App</span>
          </button>
          <button
            onClick={() => {
              if (!isAdminUnlocked) {
                setShowPinModal(true);
              } else {
                setPortalMode('admin');
              }
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              portalMode === 'admin'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Separate Admin Panel</span>
          </button>
        </div>

        {/* Right Wallet & Status Controls */}
        <div className="flex items-center gap-3">
          {portalMode === 'user' ? (
            <>
              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-xl">
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <div className="text-left">
                  <span className="text-xs font-bold text-white">{currentUserProfile?.credits ?? 25}</span>
                  <span className="text-[11px] text-slate-400 ml-1">Credits</span>
                </div>
                <button
                  onClick={() => setUserTab('billing')}
                  className="ml-1 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md text-[11px] font-semibold transition"
                >
                  + Top Up
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeedDemoData}
                className="hidden md:flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-medium transition"
                title="Populate sample customers and Razorpay/Stripe transactions"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                <span>Seed Demo Data</span>
              </button>
              <button
                onClick={() => {
                  setIsAdminUnlocked(false);
                  setPortalMode('user');
                  showToast('Admin Panel locked with PIN.', 'info');
                }}
                className="flex items-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-medium transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lock Admin</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* =========================================================
          TOAST NOTIFICATION BANNER
      ========================================================= */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md animate-bounce">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md ${
            toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/50 text-rose-200'
              : toast.type === 'info'
              ? 'bg-slate-900/95 border-indigo-500/50 text-indigo-200'
              : 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200'
          }`}>
            {toast.type === 'error' ? <XCircle className="w-5 h-5 text-rose-400 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            <span className="text-xs font-medium">{toast.message}</span>
          </div>
        </div>
      )}

      {/* =========================================================
          PORTAL 1: USER AI WORKSPACE APP
      ========================================================= */}
      {portalMode === 'user' && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* User Workspace Sidebar */}
          <aside className="w-full md:w-64 bg-slate-900/50 border-b md:border-b-0 md:border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-1.5">
              <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                AI Creative Suite
              </div>
              
              <button
                onClick={() => setUserTab('chat')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  userTab === 'chat'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4" />
                  <span>AI Chat Assistant</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/20">{platformSettings.chatCost} cr</span>
              </button>

              <button
                onClick={() => setUserTab('script')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  userTab === 'script'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4" />
                  <span>Content & Script Studio</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/20">{platformSettings.scriptCost} cr</span>
              </button>

              <button
                onClick={() => setUserTab('image')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  userTab === 'image'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-4 h-4" />
                  <span>Thumbnail & Image AI</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/20">{platformSettings.imageCost} cr</span>
              </button>

              <div className="pt-4 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Account & Billing
              </div>

              <button
                onClick={() => setUserTab('history')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  userTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <History className="w-4 h-4" />
                  <span>Saved Library</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{myGenerations.length}</span>
              </button>

              <button
                onClick={() => setUserTab('billing')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  userTab === 'billing'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-4 h-4" />
                  <span>Plans & Credit Store</span>
                </div>
                <Crown className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>

            {/* Bottom User Profile & Quick Upgrade Card */}
            <div className="hidden md:block mt-6 p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950/60 border border-indigo-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-white">{currentUserProfile?.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {currentUserProfile?.plan}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate mb-3">UID: {user?.uid}</p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mb-3">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((currentUserProfile?.credits || 0) / 100) * 100)}%` }}
                />
              </div>
              <button
                onClick={() => setUserTab('billing')}
                className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Upgrade / Buy Credits</span>
              </button>
            </div>
          </aside>

          {/* Main User Content Area */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            
            {/* -------------------------------------------
                USER TAB 1: AI CHAT ASSISTANT
            ------------------------------------------- */}
            {userTab === 'chat' && (
              <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8.5rem)] bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                {/* Persona Selector Header */}
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-400" />
                      <span>Nexus Multi-Persona AI Chat</span>
                    </h2>
                    <p className="text-xs text-slate-400">Powered by Gemini 3 Flash • {platformSettings.chatCost} Credit per response</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PERSONA_PRESETS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setChatPersona(p)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
                          chatPersona.id === p.id
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                            : 'bg-slate-800/70 border-slate-700/70 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span>{p.icon}</span>
                        <span>{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Messages Scroll Container */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-slate-800/90 border border-slate-700/80 text-slate-100 rounded-bl-none'
                      }`}>
                        <div className="flex items-center justify-between gap-4 mb-1.5 text-[11px] opacity-75">
                          <span className="font-semibold">
                            {msg.role === 'user' ? 'You' : `${chatPersona.icon} ${chatPersona.name}`}
                          </span>
                          {msg.role === 'assistant' && (
                            <button
                              onClick={() => handleCopy(msg.text, `chat-${idx}`)}
                              className="hover:text-indigo-300 flex items-center gap-1"
                            >
                              {copiedId === `chat-${idx}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>Copy</span>
                            </button>
                          )}
                        </div>
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl px-4 py-3 flex items-center gap-2.5 text-xs text-slate-300">
                        <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span>{chatPersona.name} is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendChat} className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={`Ask ${chatPersona.name} anything...`}
                    className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2 transition shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send ({platformSettings.chatCost} cr)</span>
                  </button>
                </form>
              </div>
            )}

            {/* -------------------------------------------
                USER TAB 2: AI CONTENT & SCRIPT STUDIO
            ------------------------------------------- */}
            {userTab === 'script' && (
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Config Column */}
                <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 h-fit">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-400" />
                      <span>AI Content & Script Studio</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Generate viral YouTube scripts, tech roundups & SEO posts.</p>
                  </div>

                  {/* Template Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">1. Choose Content Template</label>
                    <div className="space-y-2">
                      {SCRIPT_TEMPLATES.map(tpl => (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => setSelectedTemplate(tpl)}
                          className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                            selectedTemplate.id === tpl.id
                              ? 'bg-indigo-600/15 border-indigo-500 text-white'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          <div>
                            <div className="text-sm font-semibold">{tpl.name}</div>
                            <div className="text-xs text-slate-400">{tpl.desc}</div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {tpl.badge}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Topic Input */}
                  <form onSubmit={handleGenerateScript} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        2. Topic, Product, or Video Idea
                      </label>
                      <textarea
                        rows={3}
                        value={scriptTopic}
                        onChange={(e) => setScriptTopic(e.target.value)}
                        placeholder="e.g., Top 5 AI Smartphones in 2026 compared, or How to build a SaaS business..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Tone of Voice</label>
                        <select
                          value={scriptTone}
                          onChange={(e) => setScriptTone(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                        >
                          <option>Engaging & High-Energy</option>
                          <option>Professional & Analytical</option>
                          <option>Witty & Conversational</option>
                          <option>Dramatic Storytelling</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Target Word Count</label>
                        <select
                          value={scriptWords}
                          onChange={(e) => setScriptWords(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white outline-none"
                        >
                          <option value="300">Short (~300 words)</option>
                          <option value="600">Medium (~600 words)</option>
                          <option value="1200">In-Depth (~1200 words)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isScriptLoading || !scriptTopic.trim()}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
                    >
                      {isScriptLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Writing Masterpiece...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          <span>Generate {selectedTemplate.name} ({platformSettings.scriptCost} Credits)</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Right Output Column */}
                <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col min-h-[520px]">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white">Generated Output</h3>
                      <p className="text-xs text-slate-400">Automatically saved to your Firestore library</p>
                    </div>
                    {scriptOutput && (
                      <button
                        onClick={() => handleCopy(scriptOutput, 'script-out')}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition"
                      >
                        {copiedId === 'script-out' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copy Script</span>
                      </button>
                    )}
                  </div>

                  {scriptOutput ? (
                    <div className="flex-1 bg-slate-950/90 border border-slate-800/80 rounded-xl p-5 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed overflow-y-auto max-h-[600px]">
                      {scriptOutput}
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl">
                      <FileText className="w-10 h-10 text-slate-600 mb-3" />
                      <p className="text-sm font-medium text-slate-300">Your generated script or blog post will appear here</p>
                      <p className="text-xs text-slate-500 max-w-sm mt-1">Select a template on the left, enter your topic, and let Gemini AI craft high-converting copy.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------
                USER TAB 3: AI IMAGE & THUMBNAIL STUDIO
            ------------------------------------------- */}
            {userTab === 'image' && (
              <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5 h-fit">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-indigo-400" />
                      <span>AI Thumbnail & Image Studio</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Powered by Gemini 3.1 Flash Image • {platformSettings.imageCost} Credits / image</p>
                  </div>

                  <form onSubmit={handleGenerateImage} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                        1. Describe Your Thumbnail or Visual
                      </label>
                      <textarea
                        rows={3}
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder="e.g., Futuristic smartphone glowing on a dark obsidian table with holographic graphs floating above it..."
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-sm text-white placeholder-slate-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                        2. Visual Style Preset
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {IMAGE_STYLES.map(st => (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setSelectedStyle(st)}
                            className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-medium transition flex items-center justify-between ${
                              selectedStyle.id === st.id
                                ? 'bg-indigo-600/20 border-indigo-500 text-white'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            <span>{st.name}</span>
                            {selectedStyle.id === st.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                        3. Aspect Ratio
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { ratio: '16:9', label: '16:9 YouTube' },
                          { ratio: '1:1', label: '1:1 Square' },
                          { ratio: '9:16', label: '9:16 Reels/Shorts' }
                        ].map(item => (
                          <button
                            key={item.ratio}
                            type="button"
                            onClick={() => setAspectRatio(item.ratio)}
                            className={`py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                              aspectRatio === item.ratio
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-950 border-slate-800 text-slate-400'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isImageLoading || !imagePrompt.trim()}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
                    >
                      {isImageLoading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Rendering High-Res Visual...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Image ({platformSettings.imageCost} Credits)</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Right Image Preview Column */}
                <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 flex flex-col min-h-[500px]">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white">Live Studio Canvas</h3>
                      <p className="text-xs text-slate-400">Style: {selectedStyle.name} • Aspect Ratio: {aspectRatio}</p>
                    </div>
                    {generatedImageUrl && (
                      <a
                        href={generatedImageUrl}
                        download={`NexusAI_${Date.now()}.png`}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PNG</span>
                      </a>
                    )}
                  </div>

                  <div className="flex-1 flex items-center justify-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden p-4">
                    {isImageLoading ? (
                      <div className="text-center space-y-3 py-16">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto">
                          <Sparkles className="w-7 h-7 text-indigo-400 animate-spin" />
                        </div>
                        <p className="text-sm font-medium text-white">Synthesizing pixels with Gemini 3.1 Flash Image...</p>
                        <p className="text-xs text-slate-500">Applying {selectedStyle.name} lighting & composition</p>
                      </div>
                    ) : generatedImageUrl ? (
                      <img
                        src={generatedImageUrl}
                        alt="Generated AI Artwork"
                        className="max-h-[480px] w-auto rounded-lg shadow-2xl object-contain"
                      />
                    ) : (
                      <div className="text-center p-8">
                        <ImageIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm font-medium text-slate-300">No artwork rendered yet</p>
                        <p className="text-xs text-slate-500 max-w-xs mt-1">Enter a prompt on the left to generate crisp YouTube thumbnails, product shots, or digital art.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------
                USER TAB 4: SAVED HISTORY & LIBRARY
            ------------------------------------------- */}
            {userTab === 'history' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Your Saved AI Library</h2>
                    <p className="text-xs text-slate-400">All scripts, chat responses, and images synced with Firestore</p>
                  </div>
                  <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
                    Total Saved: <strong>{myGenerations.length}</strong>
                  </span>
                </div>

                {myGenerations.length === 0 ? (
                  <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
                    <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                    <p className="text-base font-semibold text-white">Your library is empty</p>
                    <p className="text-xs text-slate-400 mt-1 mb-4">Use AI Chat, Content Studio, or Image Studio to create your first item.</p>
                    <button
                      onClick={() => setUserTab('script')}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
                    >
                      Create Your First Script
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {myGenerations.map(item => (
                      <div key={item.id} className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                              item.type === 'image' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' :
                              item.type === 'script' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                              'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {item.type}
                            </span>
                            <h4 className="font-bold text-sm text-white">{item.title}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                            {item.type !== 'image' && (
                              <button
                                onClick={() => handleCopy(item.output, item.id)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                title="Copy content"
                              >
                                {copiedId === item.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'generations', item.id));
                                showToast('Item deleted from library.', 'info');
                              }}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {item.type === 'image' && item.output?.startsWith('data:image') ? (
                          <img src={item.output} alt={item.title} className="max-h-64 rounded-xl object-contain bg-slate-950 p-2 border border-slate-800" />
                        ) : (
                          <div className="text-xs text-slate-300 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 max-h-40 overflow-y-auto whitespace-pre-wrap">
                            {item.output}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* -------------------------------------------
                USER TAB 5: PRICING, SUBSCRIPTIONS & CREDIT STORE
            ------------------------------------------- */}
            {userTab === 'billing' && (
              <div className="max-w-6xl mx-auto space-y-8 pb-12">
                {/* Header & Currency Switcher */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 p-6 rounded-2xl border border-indigo-500/20">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Integrated Billing & Credit Wallet</span>
                    <h2 className="text-2xl font-bold text-white mt-1">Upgrade Your AI Power</h2>
                    <p className="text-xs text-slate-400 mt-1">Instant checkout via Razorpay (UPI, QR, Cards) or Stripe Global.</p>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                    <button
                      onClick={() => setCurrency('INR')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                        currency === 'INR' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <IndianRupee className="w-3.5 h-3.5" />
                      <span>INR (₹) • Razorpay</span>
                    </button>
                    <button
                      onClick={() => setCurrency('USD')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                        currency === 'USD' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>USD ($) • Stripe</span>
                    </button>
                  </div>
                </div>

                {/* Latest Payment Receipt Alert (If user just purchased) */}
                {latestReceipt && (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-white">Payment Verified! ({latestReceipt.txId})</h4>
                        <p className="text-xs text-emerald-200/80">
                          Purchased {latestReceipt.itemName} via {latestReceipt.gateway} • +{latestReceipt.creditsAdded} Credits added.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadInvoiceText(latestReceipt)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Invoice Receipt</span>
                    </button>
                  </div>
                )}

                {/* Subscription Tiers */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PLANS.map(plan => {
                    const isCurrent = currentUserProfile?.plan === plan.id;
                    const price = currency === 'INR' ? `₹${plan.inrPrice}` : `$${plan.usdPrice}`;
                    return (
                      <div
                        key={plan.id}
                        className={`rounded-2xl p-6 flex flex-col justify-between border transition relative ${
                          plan.popular
                            ? 'bg-gradient-to-b from-indigo-950/50 to-slate-900 border-indigo-500 shadow-xl shadow-indigo-600/10'
                            : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">{plan.badge}</span>
                            {isCurrent && (
                              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                                Active Plan
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                          <div className="mt-3 flex items-baseline gap-1">
                            <span className="text-3xl font-extrabold text-white">{price}</span>
                            <span className="text-xs text-slate-400">/ month</span>
                          </div>
                          <p className="text-xs text-amber-400 font-semibold mt-2 flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5 fill-amber-400" />
                            <span>Includes {plan.credits} AI Credits</span>
                          </p>

                          <ul className="mt-5 space-y-2.5 border-t border-slate-800/80 pt-4">
                            {plan.features.map((f, i) => (
                              <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <button
                          onClick={() => openCheckout(plan, true)}
                          disabled={plan.inrPrice === 0}
                          className={`mt-6 w-full py-3 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-2 ${
                            plan.inrPrice === 0
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              : plan.popular
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-white'
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>{plan.inrPrice === 0 ? 'Included Starter Tier' : `Subscribe with ${currency === 'INR' ? 'Razorpay' : 'Stripe'}`}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Instant Credit Top-Up Packs */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-base font-bold text-white mb-1">Need Instant Credit Top-Ups? (Pay-As-You-Go)</h3>
                  <p className="text-xs text-slate-400 mb-5">One-time credit packs that never expire. Ideal for heavy thumbnail or script batches.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {CREDIT_PACKS.map(pack => (
                      <div key={pack.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{pack.name}</h4>
                            <p className="text-xs text-slate-400">{pack.desc} • +{pack.credits} Credits</p>
                          </div>
                        </div>
                        <button
                          onClick={() => openCheckout(pack, false)}
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shrink-0"
                        >
                          Buy {currency === 'INR' ? `₹${pack.inrPrice}` : `$${pack.usdPrice}`}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* =========================================================
          PORTAL 2: SEPARATE ADMIN PANEL
      ========================================================= */}
      {portalMode === 'admin' && (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-950">
          
          {/* High-Density Admin Sidebar */}
          <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-1.5">
              <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Admin Back-Office</span>
              </div>

              <button
                onClick={() => setAdminTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  adminTab === 'dashboard'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Executive Revenue & KPIs</span>
              </button>

              <button
                onClick={() => setAdminTab('users')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  adminTab === 'users'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4" />
                  <span>Users & Credit Control</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-black/25 text-[10px]">{allUsers.length}</span>
              </button>

              <button
                onClick={() => setAdminTab('transactions')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  adminTab === 'transactions'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Receipt className="w-4 h-4" />
                  <span>Payment Logs & Refunds</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-black/25 text-[10px]">{allTransactions.length}</span>
              </button>

              <button
                onClick={() => setAdminTab('config')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  adminTab === 'config'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>AI Pricing & Prompts</span>
              </button>

              <button
                onClick={() => setAdminTab('backend_code')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  adminTab === 'backend_code'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Code2 className="w-4 h-4" />
                <span>Production Webhook Code</span>
              </button>
            </div>

            <div className="hidden md:block p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">System Status</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Changes to credit costs or user balances sync immediately across all active sessions.</p>
            </div>
          </aside>

          {/* Main Admin Workspace */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
            
            {/* -------------------------------------------
                ADMIN TAB 1: EXECUTIVE REVENUE & USAGE DASHBOARD
            ------------------------------------------- */}
            {adminTab === 'dashboard' && (
              <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-white">Executive Revenue & AI Usage Overview</h2>
                    <p className="text-xs text-slate-400">Real-time metrics aggregated from Firestore transactions and AI generations</p>
                  </div>
                  <button
                    onClick={handleSeedDemoData}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-emerald-400 flex items-center gap-2 self-start"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Populate Sample Analytics</span>
                  </button>
                </div>

                {/* 4 KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Total Net Revenue</span>
                      <IndianRupee className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-white">₹{adminMetrics.totalRevenueINR.toLocaleString()}</div>
                    <div className="text-[11px] text-emerald-400 mt-1">≈ ${adminMetrics.totalRevenueUSD} USD processed</div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Active Users & Subscribers</span>
                      <Users className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-white">{adminMetrics.totalUsers}</div>
                    <div className="text-[11px] text-indigo-300 mt-1">{adminMetrics.paidSubscribers} Paid Pro/Agency accounts</div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Total AI Generations</span>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-white">{adminMetrics.totalGenerations}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Chat: {adminMetrics.chatCount} • Script: {adminMetrics.scriptCount} • Img: {adminMetrics.imageCount}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span>Credits Consumed</span>
                      <Zap className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="text-2xl font-extrabold text-white">{adminMetrics.totalCreditsConsumed} cr</div>
                    <div className="text-[11px] text-rose-300 mt-1">Live API token meter</div>
                  </div>
                </div>

                {/* Breakdown Visual Bars & Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white">AI Tool Usage Distribution</h3>
                    {[
                      { label: 'AI Chat Assistant', count: adminMetrics.chatCount, color: 'bg-emerald-500' },
                      { label: 'Content & Script Studio', count: adminMetrics.scriptCount, color: 'bg-indigo-500' },
                      { label: 'AI Thumbnail & Image Studio', count: adminMetrics.imageCount, color: 'bg-pink-500' }
                    ].map((bar, idx) => {
                      const pct = adminMetrics.totalGenerations > 0
                        ? Math.round((bar.count / adminMetrics.totalGenerations) * 100)
                        : 0;
                      return (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-medium">{bar.label}</span>
                            <span className="text-slate-400">{bar.count} runs ({pct}%)</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden">
                            <div className={`${bar.color} h-full transition-all duration-500`} style={{ width: `${Math.max(4, pct)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white">Recent Payment Webhooks</h3>
                      <button onClick={() => setAdminTab('transactions')} className="text-xs text-rose-400 hover:underline">
                        View All
                      </button>
                    </div>
                    {allTransactions.slice(0, 4).map(tx => (
                      <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs">
                        <div>
                          <div className="font-semibold text-white">{tx.userName} • {tx.itemName}</div>
                          <div className="text-slate-500">{tx.gateway} ({tx.method}) • {tx.txId}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-400">
                            {tx.currency === 'INR' ? '₹' : '$'}{tx.amount}
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            tx.status === 'Success' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {tx.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {allTransactions.length === 0 && (
                      <p className="text-xs text-slate-500 py-8 text-center">No transactions logged yet. Click "Populate Sample Analytics" or test a purchase in the User App.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------
                ADMIN TAB 2: USER & CREDIT MANAGEMENT
            ------------------------------------------- */}
            {adminTab === 'users' && (
              <div className="max-w-6xl mx-auto space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white">User & Credit Wallet Management</h2>
                    <p className="text-xs text-slate-400">Add or deduct credits, upgrade plans, or suspend accounts in real time</p>
                  </div>
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={adminUserSearch}
                      onChange={(e) => setAdminUserSearch(e.target.value)}
                      placeholder="Search name, email or UID..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400 bg-slate-950/60">
                        <th className="p-4">User / Email</th>
                        <th className="p-4">Subscription Plan</th>
                        <th className="p-4">Credit Balance</th>
                        <th className="p-4">Quick Credit Adjust</th>
                        <th className="p-4">Account Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {allUsers
                        .filter(u => 
                          (u.name || '').toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(adminUserSearch.toLowerCase()) ||
                          (u.uid || '').toLowerCase().includes(adminUserSearch.toLowerCase())
                        )
                        .map(u => (
                          <tr key={u.id} className="hover:bg-slate-800/30">
                            <td className="p-4">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span>{u.name}</span>
                                {u.uid === user?.uid && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">You</span>
                                )}
                              </div>
                              <div className="text-slate-400">{u.email}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">UID: {u.uid}</div>
                            </td>

                            <td className="p-4">
                              <select
                                value={u.plan || 'Starter'}
                                onChange={(e) => handleAdminChangePlan(u.uid, e.target.value)}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                              >
                                <option value="Starter">Starter</option>
                                <option value="Pro Creator">Pro Creator</option>
                                <option value="Agency Unlimited">Agency Unlimited</option>
                              </select>
                            </td>

                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 font-bold text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-lg">
                                <Zap className="w-3.5 h-3.5 fill-amber-400" />
                                {u.credits ?? 0}
                              </span>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleAdminAdjustCredits(u.uid, u.credits, 50)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-semibold transition"
                                >
                                  +50
                                </button>
                                <button
                                  onClick={() => handleAdminAdjustCredits(u.uid, u.credits, 200)}
                                  className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-semibold transition"
                                >
                                  +200
                                </button>
                                <button
                                  onClick={() => handleAdminAdjustCredits(u.uid, u.credits, -25)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-semibold transition"
                                >
                                  -25
                                </button>
                              </div>
                            </td>

                            <td className="p-4">
                              <button
                                onClick={() => handleAdminToggleStatus(u.uid, u.status)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition ${
                                  u.status === 'Banned'
                                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                                }`}
                              >
                                {u.status === 'Banned' ? <Ban className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                                <span>{u.status || 'Active'}</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* -------------------------------------------
                ADMIN TAB 3: PAYMENT TRANSACTIONS & WEBHOOK LOGS
            ------------------------------------------- */}
            {adminTab === 'transactions' && (
              <div className="max-w-6xl mx-auto space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Payment Gateway Logs (Razorpay & Stripe)</h2>
                  <p className="text-xs text-slate-400">Audit transaction IDs, download tax receipts, or issue one-click refunds</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase text-slate-400 bg-slate-950/60">
                        <th className="p-4">Transaction ID</th>
                        <th className="p-4">Customer</th>
                        <th className="p-4">Package / Credits</th>
                        <th className="p-4">Gateway</th>
                        <th className="p-4">Amount</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-xs">
                      {allTransactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-slate-800/30">
                          <td className="p-4 font-mono text-indigo-300">
                            <div>{tx.txId}</div>
                            <div className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleString()}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-white">{tx.userName}</div>
                            <div className="text-slate-400">{tx.userEmail}</div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-white">{tx.itemName}</div>
                            <div className="text-amber-400">+{tx.creditsAdded} Credits</div>
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 font-medium">
                              {tx.gateway} • {tx.method}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-white">
                            {tx.currency === 'INR' ? '₹' : '$'}{tx.amount}
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              tx.status === 'Success'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => downloadInvoiceText(tx)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                              >
                                Invoice
                              </button>
                              {tx.status === 'Success' && (
                                <button
                                  onClick={() => handleAdminRefundTransaction(tx)}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                                >
                                  Refund
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {allTransactions.length === 0 && (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500">
                            No payment transactions recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* -------------------------------------------
                ADMIN TAB 4: AI TOOLS & PRICING CONFIGURATION
            ------------------------------------------- */}
            {adminTab === 'config' && (
              <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Global AI Tools, Credit Costs & System Prompts</h2>
                  <p className="text-xs text-slate-400">Modify credit pricing or toggle tools on/off for maintenance across the entire User App</p>
                </div>

                <form onSubmit={handleSaveGlobalConfig} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  {/* Credit Costs & Maintenance Toggles */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">AI Chat Assistant</span>
                        <input
                          type="checkbox"
                          checked={configDraft.chatEnabled}
                          onChange={(e) => setConfigDraft({ ...configDraft, chatEnabled: e.target.checked })}
                          className="w-4 h-4 accent-rose-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Credits per Message</label>
                        <input
                          type="number"
                          min="0"
                          value={configDraft.chatCost}
                          onChange={(e) => setConfigDraft({ ...configDraft, chatCost: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Content & Script Studio</span>
                        <input
                          type="checkbox"
                          checked={configDraft.scriptEnabled}
                          onChange={(e) => setConfigDraft({ ...configDraft, scriptEnabled: e.target.checked })}
                          className="w-4 h-4 accent-rose-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Credits per Script</label>
                        <input
                          type="number"
                          min="0"
                          value={configDraft.scriptCost}
                          onChange={(e) => setConfigDraft({ ...configDraft, scriptCost: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">AI Thumbnail Studio</span>
                        <input
                          type="checkbox"
                          checked={configDraft.imageEnabled}
                          onChange={(e) => setConfigDraft({ ...configDraft, imageEnabled: e.target.checked })}
                          className="w-4 h-4 accent-rose-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Credits per Image</label>
                        <input
                          type="number"
                          min="0"
                          value={configDraft.imageCost}
                          onChange={(e) => setConfigDraft({ ...configDraft, imageCost: Number(e.target.value) })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* System Prompts */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">Global AI Chat Master System Instruction</label>
                      <textarea
                        rows={2}
                        value={configDraft.defaultChatSystemPrompt}
                        onChange={(e) => setConfigDraft({ ...configDraft, defaultChatSystemPrompt: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">Global Script & Content Studio System Instruction</label>
                      <textarea
                        rows={3}
                        value={configDraft.defaultScriptSystemPrompt}
                        onChange={(e) => setConfigDraft({ ...configDraft, defaultScriptSystemPrompt: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white outline-none focus:border-rose-500"
                      />
                    </div>

                    <div className="max-w-xs">
                      <label className="text-xs font-semibold text-slate-300 block mb-1.5">Admin Panel Protection PIN</label>
                      <input
                        type="text"
                        value={configDraft.adminPin}
                        onChange={(e) => setConfigDraft({ ...configDraft, adminPin: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/25 transition"
                  >
                    Save & Broadcast Configuration
                  </button>
                </form>
              </div>
            )}

            {/* -------------------------------------------
                ADMIN TAB 5: PRODUCTION BACKEND API ROUTES
            ------------------------------------------- */}
            {adminTab === 'backend_code' && (
              <div className="max-w-5xl mx-auto space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Production Next.js API Routes (Razorpay & Stripe)</h2>
                  <p className="text-xs text-slate-400">Copy-paste these server-side route handlers into your Next.js App Router project (`app/api/...`) when deploying with live secret keys.</p>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-400">1. app/api/razorpay/verify/route.js (Signature Verification & Credit Top-Up)</span>
                    <button
                      onClick={() => handleCopy(`import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, uid, creditsToAdd } = await req.json();
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    const userRef = adminDb.collection('users').doc(uid);
    await adminDb.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      const current = doc.data()?.credits || 0;
      t.update(userRef, { credits: current + Number(creditsToAdd) });
    });
    return NextResponse.json({ verified: true, paymentId: razorpay_payment_id });
  }
  return NextResponse.json({ verified: false }, { status: 400 });
}`, 'rzp-code')}
                      className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Route</span>
                    </button>
                  </div>
                  <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-slate-300 overflow-x-auto">
{`import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, uid, creditsToAdd } = await req.json();
  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    const userRef = adminDb.collection('users').doc(uid);
    await adminDb.runTransaction(async (t) => {
      const doc = await t.get(userRef);
      const current = doc.data()?.credits || 0;
      t.update(userRef, { credits: current + Number(creditsToAdd) });
    });
    return NextResponse.json({ verified: true, paymentId: razorpay_payment_id });
  }
  return NextResponse.json({ verified: false }, { status: 400 });
}`}
                  </pre>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* =========================================================
          MODAL 1: INTERACTIVE RAZORPAY / STRIPE CHECKOUT GATEWAY
      ========================================================= */}
      {checkoutItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            {/* Gateway Header */}
            <div className={`p-5 text-white flex items-center justify-between ${
              paymentGateway === 'razorpay'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-800'
                : 'bg-gradient-to-r from-indigo-600 to-violet-700'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-extrabold text-lg">
                  {paymentGateway === 'razorpay' ? 'R' : 'S'}
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider opacity-80 font-semibold">
                    {paymentGateway === 'razorpay' ? 'Razorpay Trusted Checkout' : 'Stripe Global Checkout'}
                  </div>
                  <div className="text-base font-bold">{checkoutItem.name} (+{checkoutItem.credits} Credits)</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold">
                  {checkoutItem.currency === 'INR' ? '₹' : '$'}{checkoutItem.amount}
                </div>
                <div className="text-[10px] opacity-80">Incl. Taxes</div>
              </div>
            </div>

            {/* Gateway Switcher Tabs */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Select Payment Gateway:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentGateway('razorpay')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    paymentGateway === 'razorpay' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Razorpay (UPI/India)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentGateway('stripe')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    paymentGateway === 'stripe' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Stripe (Cards)
                </button>
              </div>
            </div>

            <form onSubmit={handleCompletePayment} className="p-6 space-y-5">
              {paymentGateway === 'razorpay' ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'upi', label: 'UPI ID', icon: Smartphone },
                      { id: 'qr', label: 'Scan QR', icon: QrCode },
                      { id: 'card', label: 'Card', icon: CreditCard }
                    ].map(m => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethodType(m.id)}
                          className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                            paymentMethodType === m.id
                              ? 'bg-blue-600/20 border-blue-500 text-white'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{m.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {paymentMethodType === 'upi' && (
                    <div>
                      <label className="text-xs text-slate-400 block mb-1.5">Enter UPI ID (GPay, PhonePe, Paytm)</label>
                      <input
                        type="text"
                        required
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okaxis"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {paymentMethodType === 'qr' && (
                    <div className="text-center p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                      <div className="w-36 h-36 mx-auto bg-white p-3 rounded-xl flex items-center justify-center">
                        <QrCode className="w-28 h-28 text-slate-900" />
                      </div>
                      <p className="text-xs text-slate-300 font-medium">Scan with any UPI App (GPay / PhonePe / Paytm)</p>
                    </div>
                  )}

                  {paymentMethodType === 'card' && (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={cardDetails.number}
                        onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                        placeholder="Card Number"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={cardDetails.expiry}
                          onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                          placeholder="MM/YY"
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={cardDetails.cvc}
                          onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                          placeholder="CVC"
                          className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-3">
                  <label className="text-xs text-slate-400 block">Card Information</label>
                  <input
                    type="text"
                    value={cardDetails.number}
                    onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={cardDetails.expiry}
                      onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={cardDetails.cvc}
                      onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                      className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCheckoutItem(null)}
                  className="w-1/3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  {isProcessingPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying Payment...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Pay {checkoutItem.currency === 'INR' ? '₹' : '$'}{checkoutItem.amount} Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: ADMIN PANEL PIN SECURITY GATE
      ========================================================= */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Enter Admin Security PIN</h3>
              <p className="text-xs text-slate-400 mt-1">Default Demo PIN is <code className="text-rose-300 font-bold">{platformSettings.adminPin}</code></p>
            </div>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="••••"
              className="w-full text-center tracking-widest text-lg bg-slate-950 border border-slate-800 rounded-xl py-2.5 text-white outline-none focus:border-rose-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowPinModal(false); setPinInput(''); }}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (pinInput === platformSettings.adminPin) {
                    setIsAdminUnlocked(true);
                    setShowPinModal(false);
                    setPinInput('');
                    setPortalMode('admin');
                    showToast('Admin Panel Unlocked!', 'success');
                  } else {
                    showToast('Invalid Admin PIN!', 'error');
                  }
                }}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white"
              >
                Unlock Admin
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}