// GitHub-style language color dots. Falls back to a neutral tone.
const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Shell: "#89e051",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Lua: "#000080",
  Scala: "#c22d40",
  Clojure: "#db5855",
  Zig: "#ec915c",
  Nix: "#7e7eff",
  R: "#198CE7",
  Julia: "#a270ba",
  Perl: "#0298c3",
  Markdown: "#083fa1",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  TeX: "#3D6117",
  Vim: "#199f4b",
};

export function languageColor(language: string | null | undefined): string {
  if (!language) return "var(--muted-foreground)";
  return LANGUAGE_COLORS[language] ?? "var(--muted-foreground)";
}
