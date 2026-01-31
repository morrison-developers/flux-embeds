# Flux Embeds

Flux Embeds is a Next.js application designed to build and host small, self-contained, iframe-friendly features — referred to as “embeds” — accessible under clean, dedicated URLs. This project aims to streamline the creation, development, and deployment of modular UI components that can be embedded across different platforms or sites.

---

## Core Concepts

- **Embeds:** Independent, minimal React components or features that run inside iframes. They are designed to be self-contained, with isolated styles and scripts to avoid conflicts.
- **Clean URLs:** Each embed lives at a unique, semantic URL path, making them easy to reference and integrate.
- **Next.js Framework:** Leverages Next.js for server-side rendering, routing, and static optimization.
- **Generator:** A CLI tool to scaffold new embeds quickly and consistently.
- **/dev Playground:** A dedicated development environment to preview and test embeds during development.

---

## Embed Architecture

- **Isolated Components:** Each embed is a standalone React component housed under the `/embeds` directory.
- **Iframe Hosting:** Embeds are rendered inside iframes to ensure style and script encapsulation.
- **Routing:** Next.js dynamic routing maps embed names to their respective components and URLs.
- **Styling:** Scoped CSS modules or styled-jsx are used to prevent styles leaking in or out.
- **Communication:** Embeds can communicate with their parent frames via the `postMessage` API if needed.

---

## Using the Embed Generator

To add a new embed, use the provided generator script:

```bash
npm run generate
```

or

```bash
yarn generate
```

The generator will prompt you to enter the embed name and set up the necessary files and boilerplate code automatically. This ensures consistency and speeds up development.

---

## Development with the /dev Playground

The `/dev` route serves as a playground for testing and previewing embeds in isolation during development. You can access it by navigating to:

```
http://localhost:3000/dev
```

Here, you can select any embed to load and interact with it without embedding it elsewhere.

---

## Embedding Conventions

- **Iframe Attributes:** Use appropriate sandboxing and sizing attributes to maintain security and responsiveness.
- **Communication:** Use `window.postMessage` for any interaction between the embed and its parent.
- **Styling:** Avoid global styles; rely on scoped CSS to prevent conflicts.
- **Performance:** Keep embeds lightweight and optimize dependencies to reduce load times.

---

## Deployment Notes

- The app can be deployed on any platform that supports Next.js applications, such as Vercel or Netlify.
- Static optimization and caching are leveraged for fast load times.
- Ensure your hosting environment supports rewrites or redirects if you modify embed URL structures.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.