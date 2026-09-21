#!/usr/bin/env python3
"""Copy only the public storefront into dist/ for Netlify. Demo/dev files stay out."""
from __future__ import annotations

import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

SKIP_DIRS = {
    "node_modules",
    "tests",
    "playwright-report",
    "test-results",
    "dist",
    ".git",
    ".cursor",
    "scripts",
    "__pycache__",
}

SKIP_FILES = {
    "serve.py",
    "start.sh",
    "lan-users.json",
    "lan-users.json.tmp",
    "package.json",
    "package-lock.json",
    "playwright.config.js",
    "netlify.toml",
    ".env",
    ".env.example",
    ".gitignore",
    "README-auth.md",
}

SKIP_EXT = {".sql", ".py", ".pyc", ".md", ".toml", ".sh"}

ALLOW_EXT = {
    ".html",
    ".css",
    ".js",
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".txt",
}


def should_copy(rel: str) -> bool:
    parts = rel.split(os.sep)
    if parts[0] in SKIP_DIRS:
        return False
    base = os.path.basename(rel)
    if base in SKIP_FILES or base.startswith("."):
        return False
    if base in ("_redirects", "_headers"):
        return True
    ext = os.path.splitext(base)[1].lower()
    if ext in SKIP_EXT:
        return False
    return ext in ALLOW_EXT


def main() -> None:
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)
    copied = 0
    for dirpath, dirnames, filenames in os.walk(ROOT):
        rel_dir = os.path.relpath(dirpath, ROOT)
        if rel_dir == ".":
            dirnames[:] = [name for name in dirnames if name not in SKIP_DIRS]
        else:
            top = rel_dir.split(os.sep)[0]
            if top in SKIP_DIRS:
                dirnames[:] = []
                continue
        for name in filenames:
            rel = name if rel_dir == "." else os.path.join(rel_dir, name)
            if not should_copy(rel):
                continue
            src = os.path.join(ROOT, rel)
            dest = os.path.join(DIST, rel)
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            shutil.copy2(src, dest)
            copied += 1
    print("Published %s files to dist/" % copied)


if __name__ == "__main__":
    main()
