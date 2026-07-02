# SurgiBot 🩺🤖  
**AI-powered training platform for surgical informed consent discussions**

You can access the platform on the following URL: https://surgibot-website.vercel.app

SurgiBot is a training platform that helps surgical residents to practice **informed consent discussions** with **virtual patients** in an online and safe environment. The goal is to prepare surgical residents for interactions with vulnerable patients in real-life settings so that they can explain surgical procedures, alternative treatment options, risks and benefits and patients' rights in a clear and understandable way, while also learning to recognize different backgrounds and needs that patients have.

---

## 📚 Table of contents
- [Learning outcomes](#learning-outcomes)
- [Modules](#modules)
- [Evidence base & co-creation](#evidence-base--co-creation)
- [Technology](#technology)
- [Privacy & safety](#privacy--safety)
- [Project status](#project-status)
- [Acknowledgments](#acknowledgments)
- [Contact](#contact)

---

## 🤓 Learning outcomes
After completing the training with SurgiBot, surgical residents should be able to:
- Understand the principles and process of surgical informed consent.
- Recognize diverse patient needs, backgrounds, and communication styles.
- Confidently discuss risks, benefits, and alternative treatment options.
- Apply recommended communication techniques in informed consent discussions.

---

## 🤖 Modules
SurgiBot is organized into modules aligned with the learning process:

### 1) Learning module (Step 1: Learn the theory)
Build a foundation for high-quality informed consent discussions, including:
- What informed consent is
- Structure and main steps of the informed consent discussion
- Patients' needs before, during and after the discussion
- Recommended communication strategies (e.g., clarity, checking patients' understanding, shared decision-making)

### 2) Vignette library (Step 2: Choose the patient vignette)
Explore a library of **patient vignettes**—concise, realistic scenarios that blend:
- demographic & clinical details,
- patient's communication style and personality traits,
- social and lifestyle factors,
- cultural context and beliefs,
- and unique communication challenges.

Learners select a case that matches their current learning goals.

### 3) Practice module (Step 3: Practice with a virtual patient)
Conduct a full informed consent discussion with a simulated patient:
- chat-based conversation in a safe, online environment,
- guided by a consent workflow (to stay structured),
- designed to help practice clear explanations and patient-centered communication.

### 4) Feedback module (Step 4: Receive feedback and improve)
Receive personalized, structured feedback to support reflection and improvement, for example:
- what was done well,
- what was missing or unclear,
- how risks/benefits/alternatives were communicated to the patient,
- patient's rights and shared decision-making elements,
- communication tips tailored to the patient's needs.

---

## 🧠 Evidence base & co-design approach
The content of SurgiBot is based on:
- a review of relevant guidelines for surgical informed consent,
- interviews with experienced surgeons from different specialties,
- a co-creation workshop with patient representatives (e.g., members of patient advisory boards in hospitals, the Swiss Patient Safety Foundation and the Swiss Patient Organisation).

---

## 👩‍💻 Technology
SurgiBot uses artificial intelligence (AI) and a large language model (LLM) to:
- simulate patient responses during practice,
- generate personalized feedback after the informed consent discussion.

**Model used in this project:** GPT-5

- Patient simulation (`/api/chat`): GPT-5
- Feedback generation (`/api/feedback`): GPT-5

---

## ⛑️ Privacy & safety
- **No real patient data:** vignettes are generated with AI and do not include real patient information.
- SurgiBot is an **educational training tool** and does **not** provide medical advice or assistance in decision support.

---

## 🎯 Project status (July 2026)

SurgiBot is currently in a **prototype and proof-of-concept stage**.

A formative usability evaluation of the first SurgiBot prototype has already been conducted with participants from medical education and clinical practice. The evaluation provided insights into the platform’s usability, perceived usefulness, acceptance, and areas for improvement. These findings are now being used to guide the next development iteration.

The main improvement areas identified include:

- making the interaction with simulated patients more realistic
- improving the Practice module through speech-based interaction
- refining the platform workflow and user interface
- improving access to vignette information during practice
- enhancing the feedback provided after the simulated discussion

Right now, the focus is on the **iterative improvement of SurgiBot based on usability testing results** and on the **implementation of speech-based interaction in the Practice module**. This development step aims to make the simulated informed consent discussions more similar to real clinical conversations, where spoken communication plays a central role. 

The next version of SurgiBot is expected to be available by the **end of summer 2026**. This version should provide a more realistic and user-friendly training experience for surgical residents and serve as the basis for further evaluation of the platform’s educational value.

---

## ✅ Acknowledgments
Designed & developed by **Lana Cvijic**.  
Thanks to the surgeons and patients' representatives who contributed with their expertise and lived experience to co-create SurgiBot.

---

## 📩 Contact
If you are interested for collaboration and testing of the platform you can reach out via the email: ***lana.cvijic@bfh.ch***
