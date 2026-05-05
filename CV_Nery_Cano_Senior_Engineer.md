# NERY ALBERTO CANO ORTIGOZA

**Senior Full-Stack Engineer | Next.js + AI/LLM (OpenAI · Anthropic · RAG) | React Native | Open to Remote**

Lambaré, Paraguay · +595 984 292 520 · nalbertoc132@gmail.com · [LinkedIn](https://www.linkedin.com/in/nery-cano-dev/) · [GitHub](https://github.com/NeryC)

---

## PROFESSIONAL SUMMARY

Senior Full-Stack Engineer with **7+ years of experience** building production-grade web and mobile applications for US and global clients. Specialized in **AI-powered products**: I architect and ship LLM integrations (OpenAI, Anthropic), RAG systems and OCR pipelines on top of modern Next.js and React Native stacks. Recent impact: cut clinician documentation time by **60%** at a US healthcare platform by integrating AWS Comprehend Medical, AWS Transcribe and custom LLM workflows into a Next.js 15 app. Polyglot side: I run **AdminRent**, a personal multi-service SaaS combining Next.js, Flask, Flutter and a TypeScript microservice for Paraguay's electronic invoicing system. Deep focus on front-end architecture, accessibility (WCAG 2.1) and performance. Remote-native, fluent async collaborator across EST/CST timezones.

---

## TECHNICAL SKILLS

- **Languages:** JavaScript (ES6+), TypeScript, Python, Dart, SQL, Bash, HTML5, CSS3, Salesforce Apex.
- **Frameworks & Libraries:** Next.js 15/16, React 19, React Native (Expo), Node.js, Express, Flask, FastAPI, Flutter, Vue.js, Refine, Contentful.
- **AI / ML:** LLM Integration (OpenAI, Anthropic), RAG Systems, OCR Pipelines, AWS Transcribe, AWS Comprehend Medical, AI Coding Agents (Cursor, Claude Code, Gemini).
- **Cloud & DevOps:** AWS, Vercel, Railway, GCP, Docker, GitHub Actions, EAS Build, Firebase.
- **State & Data:** React Query (TanStack), GraphQL, MobX State Tree, Redux, Zustand, Riverpod, PostgreSQL, MySQL, Redis, MongoDB, Supabase, Prisma, SQLAlchemy + Alembic.
- **Testing & Tooling:** React Testing Library, Jest, Pytest, a11y (WCAG 2.1), Sentry, Git, SEO & Web Performance Optimization.

---

## WORK EXPERIENCE

### Jobsity · Senior Full-Stack Developer
*Apr 2023 – Jan 2026 · Remote · Full-time*

Continuous tenure spanning two flagship engagements with US clients across healthcare and global retail.

#### Healthcare Platform · Client: Ebervetter — *Feb 2025 – Jan 2026*

- Architected a clinician-facing **Next.js 15** application with **AI/LLM integration and OCR pipelines** (AWS Transcribe & AWS Comprehend Medical), reducing medical documentation time by **60%**.
- Engineered **JSON-driven form systems** and leveraged AI coding agents (Cursor, Claude Code, Gemini) to **accelerate mobile feature delivery by 40%**.
- Architected a service-oriented mobile state management layer with **20+ modules using MobX State Tree**, improving feature isolation and testability.
- Integrated **GraphQL APIs with React Query** to ensure real-time patient data accuracy across clinician workflows.
- Enforced strict **WCAG 2.1 accessibility** standards across clinician-facing interfaces, delivering an inclusive UX for diverse users.
- *Tech:* Next.js 15, React Native, TypeScript, GraphQL, React Query, AI/LLM, OCR, AWS, a11y.

#### E-commerce Web Development · Clients: Hollister, Abercrombie & Fitch — *Apr 2023 – Jan 2024*

- Built **blazing-fast e-commerce storefronts** leveraging Next.js SSR, SSG and performance optimization patterns for global retail brands.
- Implemented **a11y best practices** (ARIA roles, semantic HTML, keyboard navigation) ensuring WCAG compliance across e-commerce flows.
- Integrated **Contentful CMS** to manage dynamic content across global retail storefronts, improving marketing agility.
- Guaranteed product stability through unit and integration testing with **React Testing Library** and shortened release cycles using **Docker** containers.
- *Tech:* Next.js (SSR/SSG), React, Node.js, Contentful, Docker, React Testing Library, a11y, Tailwind CSS.

---

### Penguin Academy · Lead Developer — CodePro Platform
*May 2024 – Jan 2025 · Asunción, Paraguay · Hybrid · Independent contractor*

- **Solely implemented core features** for the CodePro platform, significantly enhancing engagement for **90+ students** across intensive 8-month bootcamps.
- Owned the platform end-to-end: maintenance, decision-making and roadmap, working with **Next.js 14, TailwindCSS, Firebase, Node.js, Google Cloud services, Heroku, Cloudflare, Vercel and AWS S3**.
- Deployed and managed applications on **Vercel**, maintaining **99.9% uptime** and optimizing infrastructure costs.
- Resolved high-complexity bugs and ensured reliability through thorough testing with Next.js, AWS and PostgreSQL.

---

### Kenility · Full-Stack Developer (React, Next.js, Node)
*Jan 2022 – Jan 2023 · Remote · Full-time · Client: ZenBusiness*

- Maintained and expanded core features of the **ZenBusiness** platform using **React and Next.js**, focusing on quality and efficiency.
- Implemented features and conducted thorough **testing with React Testing Library** for product reliability.
- Optimized performance and shipped via **Docker** containers for efficient deployment.
- Collaborated cross-functionally to orchestrate feature launches and bug fixes using **Node.js, Docker and Tailwind CSS**.

---

### Chiatk · Front-end Developer — Crypto Fintech
*May 2021 – Jan 2023 · Remote · Independent contractor*

- Developed and maintained secure **landing pages for a cryptocurrency fintech** using **React, Vue.js and Electron**.
- Created visually appealing pages, ensuring functionality and security while updating real-time market content.
- Collaborated with design and marketing teams to enhance the company's online presence and user engagement in the crypto market.

---

### Salesforce · Salesforce Contractor
*Jan 2020 – Jan 2021 · Full-time*

- Contractor engagement working directly inside the **Salesforce ecosystem** as part of the international delivery team during my Oktana tenure.

---

### Oktana Corporation · Full-Stack Engineer — Salesforce Ecosystem
*Nov 2018 – Feb 2022 · Paraguay · Full-time*

- Engineered enterprise solutions for international clients using **Salesforce Apex, React, React Native, Webpack and Electron**.
- Delivered both **front-end and back-end** for web, mobile and desktop products on top of **Salesforce CRM** in a multidisciplinary, international team using agile methodologies.
- Built and maintained cross-platform mobile and desktop applications using **React Native and Electron**.

---

## PERSONAL PROJECTS

### AdminRent — Multi-tenant SaaS for residential property management 🇵🇾
*Personal project · in progress · Source: private*

End-to-end SaaS for managing residential complexes. Admins handle properties, tenants and rent collection from a web dashboard; residents pay, upload receipts and get push notifications from a mobile app; invoices are issued through Paraguay's **SIFEN** tax authority via an independent microservice.

**Architecture — 4 services in 4 languages:**

- **Web admin dashboard** — Next.js 16 (App Router, Server Components), React 19, TypeScript, Tailwind v4, TanStack Query, **Supabase SSR with JWT refreshed inside a Next.js proxy/middleware** that also auth-gates protected routes, Axios. Route groups `(auth)` / `(dashboard)` for clean layout separation.
- **REST API** — Python · **Flask 3 in a layered architecture** (`api / services / models / middleware`), SQLAlchemy 2 + Alembic migrations auto-applied on each Railway release, PostgreSQL, **PyJWT** with asymmetric crypto, **Flask-Limiter** for rate limiting, **Resend** for transactional email, **WeasyPrint** for PDF receipts, **OpenPyXL** for Excel exports, Gunicorn.
- **Mobile app for residents** — **Flutter (Dart 3)** with **Riverpod** state management, **Dio** HTTP, **Firebase Auth + FCM push notifications**, **sqflite** offline cache for low-connectivity scenarios, Material Design.
- **SIFEN microservice (sifen-core)** — Independent **TypeScript + Express** service that signs and submits XML invoices over **SOAP** to Paraguay's tax authority. Uses **xml-crypto + node-forge** for digital signing, **bcrypt**, **Zod** validation, **node-cron** for batch jobs, own PostgreSQL, deployed via Docker on Railway.

**Key engineering takeaways:** polyglot multi-service deployment on Railway, country-specific compliance integration (SIFEN e-invoicing), session refresh + auth gating in Next.js 16's renamed middleware (`proxy.ts`), automatic DB migrations on release, offline-first mobile UX.

---

## EDUCATION & LEADERSHIP

### B.S. in Computer Engineering · Universidad Autónoma de Asunción
*Expected 2026 — Thesis phase*

### GDG Asunción · Organizer — *2026*

- Lead organizer of Google Developer Groups Asunción events and community mentoring programs.
