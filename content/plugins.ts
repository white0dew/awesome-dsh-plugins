export const categories = [
  {
    id: "terminal-interface",
    label: "Terminal interface",
    description: "Terminal-first interfaces and workflows.",
  },
  {
    id: "developer-experience",
    label: "Developer experience",
    description: "Editing and coding workflow enhancements.",
  },
  {
    id: "visual-output",
    label: "Visual output",
    description: "Interactive output and presentation tools.",
  },
  {
    id: "vision-and-ocr",
    label: "Vision and OCR",
    description: "Image understanding and text extraction tools.",
  },
  {
    id: "web-interface",
    label: "Web interface",
    description: "Web UI enhancements for DeepSeek Harness.",
  },
] as const;

export type PluginCategory = (typeof categories)[number]["id"];

export const verificationStates = [
  "community-discovered",
  "structurally-verified",
] as const;

export type VerificationState = (typeof verificationStates)[number];

export type Plugin = {
  id: string;
  name: string;
  repoUrl: string;
  repository: string;
  description: string;
  category: PluginCategory;
  installCommand: string;
  verification: {
    state: VerificationState;
    detail: string;
  };
  featured: boolean;
  latest: boolean;
};

const notStructurallyChecked =
  "Community discovered. This directory has not structurally checked dsh.bundle.patch and its referenced patch file.";

export const plugins = [
  {
    id: "dsh-tianshu-tui",
    name: "dsh-tianshu-tui",
    repoUrl: "https://github.com/huiliyi37/dsh-tianshu-tui",
    repository: "huiliyi37/dsh-tianshu-tui",
    description: "A terminal UI for DeepSeek Harness.",
    category: "terminal-interface",
    installCommand: "dsh plugin --profile web add github:huiliyi37/dsh-tianshu-tui",
    verification: {
      state: "community-discovered",
      detail: notStructurallyChecked,
    },
    featured: true,
    latest: true,
  },
  {
    id: "dsh-at-file",
    name: "dsh-at-file",
    repoUrl: "https://github.com/omdsh-dev/dsh-at-file",
    repository: "omdsh-dev/dsh-at-file",
    description: "Codex-style @file mentions for DeepSeek Harness.",
    category: "developer-experience",
    installCommand: "dsh plugin --profile web add github:omdsh-dev/dsh-at-file",
    verification: {
      state: "community-discovered",
      detail: notStructurallyChecked,
    },
    featured: true,
    latest: true,
  },
  {
    id: "dsh-visualize",
    name: "dsh-visualize",
    repoUrl: "https://github.com/Nagi-ovo/dsh-visualize",
    repository: "Nagi-ovo/dsh-visualize",
    description: "Interactive HTML and UI cards for DeepSeek Harness.",
    category: "visual-output",
    installCommand: "dsh plugin --profile web add github:Nagi-ovo/dsh-visualize",
    verification: {
      state: "community-discovered",
      detail: notStructurallyChecked,
    },
    featured: true,
    latest: true,
  },
  {
    id: "dsh-vision-toolkit",
    name: "dsh-vision-toolkit",
    repoUrl: "https://github.com/Anionex/dsh-vision-toolkit",
    repository: "Anionex/dsh-vision-toolkit",
    description: "A vision and OCR toolkit for DeepSeek Harness.",
    category: "vision-and-ocr",
    installCommand: "dsh plugin --profile web add github:Anionex/dsh-vision-toolkit",
    verification: {
      state: "community-discovered",
      detail: notStructurallyChecked,
    },
    featured: false,
    latest: true,
  },
  {
    id: "dsh-better-sidebar",
    name: "DSH-better-sidebar",
    repoUrl: "https://github.com/omdsh-dev/DSH-better-sidebar",
    repository: "omdsh-dev/DSH-better-sidebar",
    description: "A web UI sidebar enhancement for DeepSeek Harness.",
    category: "web-interface",
    installCommand: "dsh plugin --profile web add github:omdsh-dev/DSH-better-sidebar",
    verification: {
      state: "community-discovered",
      detail: notStructurallyChecked,
    },
    featured: false,
    latest: true,
  },
] as const satisfies readonly Plugin[];

export const categoryById = Object.fromEntries(
  categories.map((category) => [category.id, category]),
) as Record<PluginCategory, (typeof categories)[number]>;
