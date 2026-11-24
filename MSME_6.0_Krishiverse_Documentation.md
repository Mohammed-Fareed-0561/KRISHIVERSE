# Krishiverse MSME 6.0 Documentation

## 1. Executive Summary

### Motivation
Krishiverse is being developed to address a persistent gap in agricultural decision support for small-holder farmers who often need timely advice in environments where connectivity is weak, data is expensive, and digital tools are fragmented. Agriculture remains central to livelihoods and local economies, but many farmers still face practical barriers in accessing trusted, usable, and language-accessible information at the moment of need. Krishiverse responds to this need by focusing on offline-first delivery, low-bandwidth usability, and farmer-friendly design for field conditions rather than urban, always-online assumptions. [NEEDS INPUT: insert validated statistics on farmer population, agriculture-sector contribution, and rural connectivity/digital access from the MSME 5.0 source or official references before final submission.]

### Problem
Small-holder farmers face delays in identifying crop diseases, limited visibility into weather and mandi price movements, difficulty understanding government schemes, and dependence on multiple disconnected services for answers that are often needed immediately. These issues are amplified by language barriers, low digital familiarity, and inconsistent internet access, which together reduce the usefulness of conventional agri-apps in real rural operating conditions.

### Approach
Krishiverse, developed by Deventur, is designed as an offline-first AI-enabled agricultural platform delivered through a Progressive Web App. It combines crop advisory, plant disease detection, weather forecasting, mandi price visibility, shop and service discovery, government scheme guidance, and multilingual interaction into one integrated ecosystem. Its architecture prioritizes local processing, cached data, IndexedDB storage, and sync on connectivity so that core workflows remain usable even in low-network environments.

### Result
The source documentation provides expected outcomes and launch targets rather than reported field results. Based on those documented targets, Krishiverse aims to support 5,000+ farmers in the first six months, reach 1,000+ daily active users by month six, maintain 40%+ offline session starts, achieve 60%+ 30-day retention, and sustain disease diagnosis accuracy above 85% for the primary disease set in scope. Additional expected outcomes include faster access to crop guidance, improved awareness of schemes, more timely market decisions, and broader access to agricultural information in regional languages.

### Conclusion
Krishiverse is positioned as a practical digital infrastructure layer for farmers who cannot rely on constant connectivity yet still need timely, trustworthy agricultural support. By combining offline-first engineering with focused AI use cases and multilingual accessibility, the project aims to make high-value farm decision support available in the environments where it is most needed.

## 2. Project Description

Krishiverse is an offline-first agricultural advisory platform built as a Progressive Web App for small-holder farmers, with current documentation focused on Tamil Nadu and South India. The platform is intended to reduce the operational friction farmers face when seeking crop guidance, disease detection, weather forecasts, mandi prices, government scheme information, and local agri-service access across multiple disconnected channels. Instead of depending on persistent cloud access, Krishiverse is designed to keep essential functions available after initial load through service-worker caching, local storage, IndexedDB persistence, and on-device or low-dependency AI workflows.

The project brings together a set of integrated modules that reflect routine farm decisions. The Ask feature provides agricultural question-and-answer support in natural language. Diagnose enables image-based disease identification and treatment guidance. Weather offers cached seven-day forecasting with context-aware advisories. Mandi Prices improves market awareness through local price visibility and trend comparison. Maps helps users locate nearby input shops, drone services, and relevant offices. Schemes organizes subsidy and eligibility information into simpler step-by-step guidance. Multi-language support is a core layer across the experience to ensure accessibility beyond English-speaking users.

From a systems perspective, Krishiverse is deliberately lightweight and cost-conscious. The documented stack includes React and Vite for the application layer, TensorFlow.js and local AI workflows for offline-capable intelligence, i18next for localization, Leaflet and OpenStreetMap for mapping, and service-worker plus IndexedDB patterns for resilient offline use. The documented constraints also emphasize low-end Android compatibility, minimal recurring cost, and operation on 2G/3G conditions, which aligns the product with the realities of its intended users.

The project is therefore not only a feature bundle, but a delivery model for agricultural assistance that prioritizes availability, simplicity, and local relevance. Its design assumptions suggest that a farmer should be able to open the app in the field, use it in a preferred language, retrieve guidance quickly, and continue core workflows even when connectivity is absent or intermittent.

### Key Objectives

- Deliver agricultural advisory support that remains usable in low-connectivity and offline conditions.
- Reduce information fragmentation by combining crop guidance, diagnosis, weather, mandi prices, and schemes in one platform.
- Enable faster crop disease identification with on-device or offline-capable AI-assisted workflows.
- Provide localized, multilingual access for farmers who are not comfortable with English-only interfaces.
- Improve decision-making through timely access to weather forecasts and market price information.
- Simplify awareness and understanding of government agricultural schemes and eligibility pathways.
- Keep the platform lightweight, affordable, and compatible with low-end Android devices and constrained data environments.
- Build a farmer-friendly interface with simple navigation, large touch targets, and accessible presentation.

## 3. Operational Plan

### 3.1 Objectives, Activities and Timeline

| Objective | Key Activities | Timeline (Month/Quarter) |
|-----------|----------------|--------------------------|
| Research and validation | Consolidate product requirements, review farmer pain points, validate low-connectivity use cases, finalize priority feature scope for MVP | Month 1 / Quarter 1 |
| Core platform development | Build offline-first PWA foundation, implement Ask, Diagnose, Weather, service worker, IndexedDB storage, and Tamil plus English baseline support | Month 1-2 / Quarter 1 |
| Feature expansion | Add Mandi Prices, Maps, Government Schemes, and broader multilingual support based on documented phase priorities | Month 2 / Quarter 1 |
| Pilot testing and quality assurance | Test with real users, validate disease model accuracy, verify offline caching and sync behavior, review translations, optimize performance on low-end devices | Month 3 / Quarter 1 |
| Launch and scale-up | Deploy production build, monitor adoption and errors, integrate user feedback, and prepare post-MVP roadmap items for scale | Month 3 onward / Quarter 2+ |

### 3.2 Resources Required

| Resource Category (Human / Technical / Financial / Infrastructure) | Specific Requirement | Purpose |
|--------------------------------------------------------------------|----------------------|---------|
| Human | Product and execution leadership across strategy, delivery, and partnerships | Coordinate rollout, priorities, and stakeholder alignment |
| Human | AI/ML and full-stack engineering capacity | Build offline advisory, disease detection, sync, and core app workflows |
| Human | Community and customer-facing outreach support | Onboard farmers, gather feedback, and improve usability in the field |
| Human | Revenue, partnership, and institutional liaison support | Support scale-up through business development and ecosystem relationships |
| Technical | React 18, Vite, Tailwind CSS, Zustand, i18next, Leaflet/OpenStreetMap | Deliver the front-end application and multilingual user experience |
| Technical | TensorFlow.js disease model, local AI workflow, service worker, IndexedDB | Enable offline intelligence, local persistence, and resilient usage |
| Technical | Weather, mandi-price, and scheme data integrations | Provide current agricultural information when connectivity is available |
| Financial | Lean operating budget with free or minimal-cost infrastructure and API usage | Maintain affordability within documented budget constraints |
| Infrastructure | Android test devices, low-bandwidth test conditions, hosting environment, and field testing setup | Validate performance for target users and deploy reliably |

### 3.3 Roles and Responsibilities

| Team Member | Role | Key Responsibilities |
|-------------|------|----------------------|
| Fareed | CEO | Overall strategy, project governance, partnerships, execution oversight, and alignment with organizational goals |
| Yasir | CTO | Technical architecture, offline-first system design, AI/ML development, platform reliability, and engineering coordination |
| Vaishnavi | CCO | Farmer onboarding, customer and community relationships, feedback collection, multilingual adoption support, and outreach planning |
| Tasneem | CRO | Revenue planning, business development, institutional partnerships, and liaison with government, NGO, and ecosystem stakeholders |

### 3.4 Quality Control

| Quality Area | Control Measure | Intended Outcome |
|--------------|-----------------|------------------|
| AI model accuracy validation | Validate disease predictions against known disease samples and periodically review top-confidence outputs | Maintain acceptable diagnostic reliability for in-scope crops and diseases |
| User testing with real farmers | Conduct structured usability testing with target users in low-connectivity settings | Ensure workflows remain understandable and usable in field conditions |
| Data privacy and security checks | Review local storage practices, encryption approach for sensitive data, HTTPS usage, and access boundaries | Protect user data and preserve privacy-first design commitments |
| Offline sync reliability testing | Test cached reads, queued updates, stale-data handling, and recovery after reconnection | Reduce sync failures and avoid data loss or user confusion |
| Multilingual content review | Review translated interface strings and content with native-language validation | Improve clarity, consistency, and trust across supported languages |

### 3.5 Risk Management

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Low farmer digital literacy or slow adoption | Medium | High | Use a simple UI, large touch targets, local-language content, onboarding support, and feedback-led iteration |
| AI model accuracy varies across regional conditions | Medium | High | Limit claims to supported disease scope, validate outputs, provide confidence indicators, and improve models using reviewed samples |
| Offline-sync data conflicts or stale records | Medium | Medium | Use sync queues, timestamps, clear offline indicators, and conflict-handling logic for cached data refresh |
| Dependence on government scheme data accuracy and freshness | Medium | Medium | Schedule periodic scheme reviews, display update timestamps, and maintain manual verification for critical content |
| Competition from established agri-apps | High | Medium | Differentiate on offline-first usability, integrated workflows, low-cost delivery, and multilingual accessibility |
| Funding or scaling constraints | Medium | High | Maintain a lean cost structure, prioritize high-value features, use free-tier infrastructure where practical, and build partnership channels |

### 3.6 Evaluation and Monitoring

| KPI | How It Will Be Tracked | Monitoring Frequency |
|-----|------------------------|----------------------|
| Total users and active users | Product analytics on registrations, installs, and daily/monthly active usage | Monthly |
| Disease detection accuracy rate | Sample-based validation against reviewed diagnoses and outcome audits for in-scope disease classes | Monthly review, quarterly recalibration |
| Scheme guidance usage and applications facilitated | Track scheme-page usage, eligibility-check interactions, and assisted application counts where available | Monthly |
| Offline usage percentage | Monitor share of sessions initiated or continued in offline mode through app analytics | Monthly |
| 30-day retention rate | Cohort tracking of returning users from first use to day 30 | Monthly |
| Feature adoption by module | Measure usage share across Ask, Diagnose, Weather, Prices, Maps, and Schemes | Monthly |
| Data refresh and sync reliability | Track successful weather, mandi-price, and sync refresh events versus failures | Monthly |
| Farmer income or productivity impact | Structured self-reported surveys on savings, avoided crop loss, or improved decision timing | Quarterly [NEEDS INPUT: define baseline survey design and target sample size.] |

## 4. Project Statements

**Vision Statement**  
To make reliable, multilingual, and offline-accessible agricultural intelligence available to every small-holder farmer at the point of need.

**Mission Statement**  
Krishiverse aims to deliver an affordable offline-first digital platform that helps farmers make better crop, weather, market, and scheme-related decisions through accessible design, localized content, and practical AI-enabled assistance.

**Problem/Solution Statement**  
Small-holder farmers often need urgent agricultural guidance in environments where internet access is weak, information sources are fragmented, and language barriers reduce the usefulness of existing tools. Krishiverse addresses this gap through an integrated offline-first platform that combines crop advisory, disease detection, weather information, mandi prices, scheme guidance, and local service discovery into a single farmer-friendly experience built for low-connectivity conditions.

## 5. Scope of Future Work

The source roadmap identifies these as post-MVP directions but does not assign dates. The horizon grouping below is inferred for MSME 6.0 planning.

### Near-Term (6-12 months)

- Voice input and voice output support to reduce text dependence in field use.
- Crop planning tools to help farmers organize seasonal activities and advisory needs.
- Soil health testing integration to extend decision support beyond visible disease symptoms.

### Long-Term (1-3 years)

- IoT sensor integration for soil moisture, temperature, and related field signals.
- Community features such as farmer groups and peer knowledge exchange.
- iOS version expansion to broaden device coverage beyond Android-first deployment.

## 6. Visual Placeholders

[FLOWCHART PLACEHOLDER - System/User Flow]  
Caption: Farmer journey showing app open, question or image capture, offline AI diagnosis or advisory, cached output, and later sync when online.

[FLOWCHART PLACEHOLDER - Offline-First Architecture]  
Caption: Local edge AI, service worker caching, IndexedDB/local storage, queued updates, and cloud synchronization on restored connectivity.

[COMPARISON TABLE PLACEHOLDER - Krishiverse vs Existing Solutions]  
Caption: Reserved for a feature-by-feature comparison table against DeHaat Kisan, Kisan Suvidha, Plantix, and AgroStar.

| Feature | Existing Apps | Krishiverse |
|---------|---------------|-------------|
