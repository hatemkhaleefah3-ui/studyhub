# Study Hub Agent Guide

> Guidance for automated agents and tools interacting with the Study Hub website.

## Installation

Study Hub is delivered as a hosted web application. No local installation is required for normal use. Open the production site in a modern browser with JavaScript enabled.

## Configuration

The application uses browser and server-side storage for study data and preferences. Appearance settings may include light or dark mode and accent-color choices. Cloudflare Pages serves the frontend and Pages Functions provide the application's private data endpoints.

## Usage

Users can create and manage subjects, lectures, attachments, flashcards, exams, schedules, checklists, archives, and progress records. Automated tools should use public navigation and documentation links rather than guessing generated record identifiers.

## Privacy

- Treat subject names, lecture names, exam questions, answers, scores, schedules, attachments, and progress records as private user information.
- Do not expose, republish, or transmit user-created study data without explicit permission.
- Do not attempt to enumerate or infer private records through generated identifiers.
- Avoid storing private study content in logs, analytics, or third-party services unless the user has explicitly approved it.

## Public interfaces

Study Hub does not currently advertise a public third-party API, MCP server, A2A agent card, UCP profile, ACP profile, or agent-permissions endpoint. A missing protocol document should be treated as unavailable rather than inferred from the application HTML.

## Documentation

- [Site overview](/index.md)
- [Glossary](/glossary.md)
- [Sitemap](/sitemap.md)
- [Concise agent index](/llms.txt)
- [Full agent context](/llms-full.txt)
