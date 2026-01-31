# Flux Embeds Contributing Guidelines

Welcome to the Flux Embeds project! This document outlines the guidelines for contributing to the project, including how to generate new features, structure embeds, use iframes, work with the `/dev` environment, follow API conventions, apply styling, and submit pull requests.

---

## Feature Generation via CLI

To create a new embed or feature, use the Flux CLI tool:

```bash
flux generate embed <embed-name>
```

This command scaffolds the basic files and structure needed for a new embed. Follow the prompts to customize your embed.

---

## Embed Structure

Each embed should follow this structure:

- **`index.tsx`**: The main React component for the embed.
- **`types.ts`**: TypeScript definitions for props and data structures.
- **`api.ts`**: API interaction logic, if applicable.
- **`styles.module.css`**: CSS modules for styling the embed.

Ensure your embed is self-contained and does not rely on global styles or scripts.

---

## Iframe Requirements

Embeds are rendered inside iframes to isolate them from the host page. Keep the following in mind:

- Avoid any code that breaks out of the iframe.
- Use relative URLs or absolute URLs that work inside the iframe context.
- Ensure the embed is responsive and adapts to the iframe size.

---

## Using `/dev`

The `/dev` environment is designed for local development and testing of embeds.

- Run the dev server with:

  ```bash
  flux dev
  ```

- Access your embed at `http://localhost:3000/dev/<embed-name>`.
- Use this environment to verify your embed’s functionality, styling, and API interactions before submitting.

---

## API Conventions

When working with APIs:

- Use the `api.ts` file to encapsulate all API calls.
- Follow RESTful conventions and handle errors gracefully.
- Use TypeScript interfaces to define request and response shapes.
- Avoid direct fetch calls in components; instead, create reusable API functions.

---

## Styling Rules

- Use CSS modules (`styles.module.css`) for styling.
- Follow the Flux design system tokens and variables.
- Keep styles scoped to the embed component.
- Avoid global CSS or inline styles unless absolutely necessary.
- Ensure accessibility and responsiveness in your styles.

---

## Pull Request Checklist

Before submitting a PR, ensure:

- [ ] Your code follows the project’s coding standards.
- [ ] All new features have corresponding tests.
- [ ] Documentation is updated if necessary.
- [ ] The embed works correctly in the `/dev` environment.
- [ ] No console errors or warnings are present.
- [ ] Styles are consistent and responsive.
- [ ] API interactions handle errors properly.

Thank you for contributing to Flux Embeds! If you have any questions, please reach out to the maintainers.
