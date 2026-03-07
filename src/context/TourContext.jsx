import React, { createContext, useContext, useState } from 'react';
import { driver } from 'driver.js';
import { X, Globe } from 'lucide-react';
import 'driver.js/dist/driver.css';
import './TourContext.css';

const TourContext = createContext();

export const useTour = () => useContext(TourContext);

const translations = {
    en: {
        next: 'Next',
        prev: 'Back',
        done: 'Got It!',
        global: {
            saheliTitle: 'Saheli AI Chat',
            saheliDesc: 'Meet Saheli, your supportive AI companion! Available on any page whenever you need guidance or a safe chat.',
            navTitle: 'Navigation Menu',
            navDesc: 'Use this sidebar to jump between Communities, Health, Finance, and Stories.'
        },
        community: {
            postTitle: 'Share with the Sisterhood',
            postDesc: 'Click here to start a new anonymous or public discussion.',
            searchTitle: 'Find Answers',
            searchDesc: 'Search for existing discussions, tags, or specific topics.',
            filterTitle: 'Filter by Interest',
            filterDesc: 'Quickly find posts about career, health, relationships, and more.',
            rulesTitle: 'Safe Space Rules',
            rulesDesc: 'Our community guidelines ensure this remains a supportive, non-judgmental space.'
        },
        circles: {
            createTitle: 'Create a Circle',
            createDesc: 'Start your own private or public micro-community around a specific interest.',
            discoverTitle: 'Discover Circles',
            discoverDesc: 'Search for existing circles or filter them by category to find your tribe.'
        },
        health: {
            exportTitle: 'Export Your Data',
            exportDesc: 'Extract your cycle, mood, and health data into a PDF report anytime.',
            dashboardTitle: 'Your Private Dashboard',
            dashboardDesc: 'Track your cycle, log daily moods, and view health metrics all in one place.',
            remindersTitle: 'Reminders & Education',
            remindersDesc: 'Set medication/hydration reminders and read curated articles on women\'s health.'
        },
        finance: {
            wealthTitle: 'Wealth Building',
            wealthDesc: 'Plan your financial goals and dive into detailed financial independence lessons.',
            actionTitle: 'Actionable Steps',
            actionDesc: 'Participate in savings challenges and explore side hustle ideas to boost income.'
        },
        stories: {
            inspireTitle: 'Inspire Others',
            inspireDesc: 'Everyone has a story. Share your journey here to empower other sisters.',
            heroTitle: 'Featured Inspiration',
            heroDesc: 'Read our featured story of the week highlighting spectacular women.',
            findTitle: 'Find Stories',
            findDesc: 'Look for stories about motherhood, tech, or overcoming specific challenges.'
        },
        default: {
            notifyTitle: 'Stay Notified',
            notifyDesc: 'Check here for important updates from your communities.'
        }
    },
    hi: {
        next: 'अगला',
        prev: 'पीछे',
        done: 'समझ गए!',
        global: {
            saheliTitle: 'सहेली AI चैट',
            saheliDesc: 'सहेली से मिलें, आपकी सहायक AI साथी! जब भी आपको मार्गदर्शन या सुरक्षित बातचीत की आवश्यकता हो, यह किसी भी पृष्ठ पर उपलब्ध है।',
            navTitle: 'नेविगेशन मेनू',
            navDesc: 'समुदाय, स्वास्थ्य, वित्त और कहानियों के बीच जाने के लिए इस साइडबार का उपयोग करें।'
        },
        community: {
            postTitle: 'बहनों के साथ साझा करें',
            postDesc: 'एक नई अनाम या सार्वजनिक चर्चा शुरू करने के लिए यहाँ क्लिक करें।',
            searchTitle: 'उत्तर खोजें',
            searchDesc: 'मौजूदा चर्चाओं, टैग्स, या विशिष्ट विषयों की खोज करें।',
            filterTitle: 'रुचि के अनुसार फ़िल्टर करें',
            filterDesc: 'करियर, स्वास्थ्य, रिश्तों और अन्य के बारे में पोस्ट जल्दी से खोजें।',
            rulesTitle: 'सुरक्षित स्थान के नियम',
            rulesDesc: 'हमारे सामुदायिक दिशानिर्देश यह सुनिश्चित करते हैं कि यह सुरक्षित और निर्णयात्मक स्थान बना रहे।'
        },
        circles: {
            createTitle: 'एक मंडली (Circle) बनाएँ',
            createDesc: 'किसी विशिष्ट रुचि के आसपास अपना स्वयं का निजी या सार्वजनिक सूक्ष्म-समुदाय शुरू करें।',
            discoverTitle: 'मंडलियाँ खोजें',
            discoverDesc: 'मौजूदा मंडलियों की खोज करें या अपनी पसंद खोजने के लिए उन्हें श्रेणी के अनुसार फ़िल्टर करें।'
        },
        health: {
            exportTitle: 'अपना डेटा निर्यात करें',
            exportDesc: 'किसी भी समय अपनी साइकिल, मूड और स्वास्थ्य डेटा को एक पीडीएफ रिपोर्ट में निकालें।',
            dashboardTitle: 'आपका निजी डैशबोर्ड',
            dashboardDesc: 'अपनी साइकिल ट्रैक करें, दैनिक मूड लॉग करें, और स्वास्थ्य मेट्रिक्स को एक ही स्थान पर देखें।',
            remindersTitle: 'रिमाइंडर और शिक्षा',
            remindersDesc: 'दवा/पानी पीने के रिमाइंडर सेट करें और महिलाओं के स्वास्थ्य पर चुनिंदा लेख पढ़ें।'
        },
        finance: {
            wealthTitle: 'धन निर्माण (Wealth Building)',
            wealthDesc: 'अपने वित्तीय लक्ष्यों की योजना बनाएं और वित्तीय स्वतंत्रता के विस्तृत पाठों में शामिल हों।',
            actionTitle: 'कार्रवाई योग्य कदम',
            actionDesc: 'आय बढ़ाने के लिए बचत चुनौतियों में भाग लें और साइड हसल विचारों का अन्वेषण करें।'
        },
        stories: {
            inspireTitle: 'दूसरों को प्रेरित करें',
            inspireDesc: 'हर किसी की एक कहानी होती है। अन्य बहनों को सशक्त बनाने के लिए अपनी यात्रा यहाँ साझा करें।',
            heroTitle: 'विशेष प्रेरणा',
            heroDesc: 'शानदार महिलाओं को उजागर करने वाली हमारी इस सप्ताह की विशेष कहानी पढ़ें।',
            findTitle: 'कहानियाँ खोजें',
            findDesc: 'मातृत्व, टेक, या विशिष्ट चुनौतियों पर काबू पाने के बारे में कहानियाँ खोजें।'
        },
        default: {
            notifyTitle: 'अधिसूचित रहें',
            notifyDesc: 'अपने समुदायों से महत्वपूर्ण अपडेट के लिए यहाँ जाँचे।'
        }
    }
};

export const TourProvider = ({ children }) => {
    const [isLangModalOpen, setIsLangModalOpen] = useState(false);

    const startTour = () => {
        setIsLangModalOpen(true);
    };

    const runTour = (lang) => {
        setIsLangModalOpen(false);
        const t = translations[lang];
        let tourSteps = [];
        const path = window.location.pathname;

        // Global elements always included at the end
        const globalSteps = [
            {
                element: '.tour-ai-chat',
                popover: { title: t.global.saheliTitle, description: t.global.saheliDesc, side: 'left', align: 'center' }
            },
            {
                element: '.tour-sidebar',
                popover: { title: t.global.navTitle, description: t.global.navDesc, side: 'right', align: 'start' }
            }
        ];

        switch(true) {
            case path.startsWith('/community'):
                tourSteps = [
                    { element: '.tour-create-post', popover: { title: t.community.postTitle, description: t.community.postDesc, side: 'bottom', align: 'center' } },
                    { element: '.search-bar-container', popover: { title: t.community.searchTitle, description: t.community.searchDesc, side: 'bottom', align: 'start' } },
                    { element: '.category-filters', popover: { title: t.community.filterTitle, description: t.community.filterDesc, side: 'bottom', align: 'start' } },
                    { element: '.guidelines-card', popover: { title: t.community.rulesTitle, description: t.community.rulesDesc, side: 'left', align: 'start' } }
                ];
                break;
            case path.startsWith('/circles'):
                tourSteps = [
                    { element: '.tour-create-circle', popover: { title: t.circles.createTitle, description: t.circles.createDesc, side: 'bottom', align: 'end' } },
                    { element: '.circles-controls', popover: { title: t.circles.discoverTitle, description: t.circles.discoverDesc, side: 'bottom', align: 'start' } }
                ];
                break;
            case path.startsWith('/health'):
                tourSteps = [
                    { element: '.health-header .btn-outline', popover: { title: t.health.exportTitle, description: t.health.exportDesc, side: 'bottom', align: 'center' } },
                    { element: '.tour-health-dashboard', popover: { title: t.health.dashboardTitle, description: t.health.dashboardDesc, side: 'top', align: 'center' } },
                    { element: '.dashboard-sidebar', popover: { title: t.health.remindersTitle, description: t.health.remindersDesc, side: 'left', align: 'start' } }
                ];
                break;
            case path.startsWith('/finance'):
                tourSteps = [
                    { element: '.tour-finance-goals', popover: { title: t.finance.wealthTitle, description: t.finance.wealthDesc, side: 'right', align: 'start' } },
                    { element: '.finance-sidebar', popover: { title: t.finance.actionTitle, description: t.finance.actionDesc, side: 'left', align: 'start' } }
                ];
                break;
            case path.startsWith('/stories'):
                tourSteps = [
                    { element: '.tour-share-story', popover: { title: t.stories.inspireTitle, description: t.stories.inspireDesc, side: 'bottom', align: 'end' } },
                    { element: '.hero-story', popover: { title: t.stories.heroTitle, description: t.stories.heroDesc, side: 'bottom', align: 'center' } },
                    { element: '.stories-controls', popover: { title: t.stories.findTitle, description: t.stories.findDesc, side: 'bottom', align: 'start' } }
                ];
                break;
            default:
                tourSteps = [
                    { element: '.tour-notifications', popover: { title: t.default.notifyTitle, description: t.default.notifyDesc, side: 'bottom', align: 'end' } }
                ];
                break;
        }

        const finalSteps = [...tourSteps, ...globalSteps];

        const tourObj = driver({
            showProgress: true,
            animate: true,
            padding: 10,
            allowClose: true,
            overlayColor: 'rgba(0, 0, 0, 0.65)',
            nextBtnText: t.next,
            prevBtnText: t.prev,
            doneBtnText: t.done,
            steps: finalSteps
        });

        tourObj.drive();
    };

    return (
        <TourContext.Provider value={{ startTour }}>
            {children}
            {isLangModalOpen && (
                <div className="tour-lang-modal-overlay">
                    <div className="tour-lang-modal">
                        <div className="tour-lang-header">
                            <h3><Globe size={20} style={{marginRight: '8px', color: 'var(--color-plum)'}} /> Choose Demo Language</h3>
                            <button onClick={() => setIsLangModalOpen(false)} className="close-btn"><X size={20} /></button>
                        </div>
                        <p className="tour-lang-desc">In which language would you like to take the interactive tour of this page?</p>
                        <div className="tour-lang-buttons">
                            <button className="btn btn-outline lang-btn" onClick={() => runTour('en')}>English</button>
                            <button className="btn btn-primary lang-btn" onClick={() => runTour('hi')} style={{marginLeft: '12px'}}>हिंदी (Hindi)</button>
                        </div>
                    </div>
                </div>
            )}
        </TourContext.Provider>
    );
};
