---
title: Custom providers
description: Configure custom providers, alternative endpoints, profiles, custom binaries, and ACP agents in ~/.paseo/config.json.
nav: Custom providers
order: 22
category: Providers
---

# Custom providers

Everything beyond the [supported providers](/docs/supported-providers) lives under `agents.providers` in `~/.paseo/config.json`. You can:

- **Extend** a first-class provider to point at a different API (Z.AI, Alibaba/Qwen, a proxy, a self-hosted endpoint).
- **Add profiles**, multiple entries against the same underlying provider with different credentials or curated model lists.
- **Override the binary**, run a nightly build, a wrapper script, or a Docker image instead of the installed CLI.
- **Add ACP agents**, Gemini CLI, Hermes, or any agent speaking the Agent Client Protocol over stdio.
- **Disable** a provider you don't use.

Run `paseo reload` after editing the file. Provider changes apply to future launches without restarting the daemon.

Provider IDs must be lowercase alphanumeric with hyphens (`/^[a-z][a-z0-9-]*$/`). Every custom entry needs `extends` (a first-class provider ID or `"acp"`) and a `label`.

The examples below are a quick tour. The full, up-to-date reference is on GitHub: [docs/custom-providers.md](https://github.com/getpaseo/paseo/blob/main/docs/custom-providers.md).

## Extending a first-class provider

```json
{
  "agents": {
    "providers": {
      "my-claude": {
        "extends": "claude",
        "label": "My Claude",
        "env": {
          "ANTHROPIC_API_KEY": "sk-ant-...",
          "ANTHROPIC_BASE_URL": "https://my-proxy.example.com/v1"
        }
      }
    }
  }
}
```

## Z.AI (GLM) coding plan

Z.AI exposes GLM models through an Anthropic-compatible endpoint. Point `ANTHROPIC_BASE_URL` at their API and use `ANTHROPIC_AUTH_TOKEN` for the key. Third-party endpoints don't support Anthropic's server-side tools, so disable `WebSearch`.

```json
{
  "agents": {
    "providers": {
      "zai": {
        "extends": "claude",
        "label": "ZAI",
        "env": {
          "ANTHROPIC_AUTH_TOKEN": "<your-zai-api-key>",
          "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
          "API_TIMEOUT_MS": "3000000"
        },
        "disallowedTools": ["WebSearch"],
        "models": [
          { "id": "glm-5-turbo", "label": "GLM 5 Turbo", "isDefault": true },
          { "id": "glm-5.1", "label": "GLM 5.1" }
        ]
      }
    }
  }
}
```

## Alibaba Cloud (Qwen) coding plan

Alibaba's coding plan routes Claude Code to Qwen models via an Anthropic-compatible API. Subscription keys look like `sk-sp-...` and must be created in the Singapore region.

```json
{
  "agents": {
    "providers": {
      "qwen": {
        "extends": "claude",
        "label": "Qwen (Alibaba)",
        "env": {
          "ANTHROPIC_AUTH_TOKEN": "sk-sp-<coding-plan-key>",
          "ANTHROPIC_BASE_URL": "https://coding-intl.dashscope.aliyuncs.com/apps/anthropic"
        },
        "disallowedTools": ["WebSearch"],
        "models": [
          { "id": "qwen3.5-plus", "label": "Qwen 3.5 Plus", "isDefault": true },
          { "id": "qwen3-coder-next", "label": "Qwen 3 Coder Next" }
        ]
      }
    }
  }
}
```

## Multiple profiles

Create as many entries as you want against the same first-class provider. Each one shows up as a separate option in the app with its own credentials and models.

```json
{
  "agents": {
    "providers": {
      "claude-work": {
        "extends": "claude",
        "label": "Claude (Work)",
        "env": { "ANTHROPIC_API_KEY": "sk-ant-work-..." }
      },
      "claude-personal": {
        "extends": "claude",
        "label": "Claude (Personal)",
        "env": { "ANTHROPIC_API_KEY": "sk-ant-personal-..." }
      }
    }
  }
}
```

## Custom binary

`command` is an array, first element is the binary, the rest are arguments. It fully replaces the default launch command for that provider.

```json
{
  "agents": {
    "providers": {
      "claude": {
        "command": ["/opt/claude-nightly/claude"]
      }
    }
  }
}
```

## ACP providers

Any agent that speaks [ACP](https://agentclientprotocol.com) over stdio can be added with `extends: "acp"` and a `command`. Paseo spawns the process, sends an `initialize` JSON-RPC request, and the agent reports its capabilities, modes, and models at runtime.

```json
{
  "agents": {
    "providers": {
      "gemini": {
        "extends": "acp",
        "label": "Google Gemini",
        "command": ["gemini", "--acp"]
      },
      "hermes": {
        "extends": "acp",
        "label": "Hermes",
        "command": ["hermes", "acp"]
      }
    }
  }
}
```

### Antigravity

Installing the `agy` CLI does not give you the ACP kernel. Google ships `agy_acp_server` as a separate zip, and Paseo's catalog entry runs it as `agy_acp_server` from `$PATH`. There is no Intel Mac build; only `darwin-arm64`, `linux-x86_64`, and `windows-x86_64` archives exist.

The archive holds two files, `agy_acp_server.par` and `localharness_external`, which must stay in the same directory. Do not symlink the `.par` into your bin directory; wrap it instead. On Apple Silicon:

```bash
mkdir -p ~/.local/opt/agy-acp ~/.local/bin
curl -fL -o /tmp/agy-acp.zip \
  https://dl.google.com/agy-extensions/releases/macos/agy-acp-server-agy_acp_server_1.1.1-darwin-arm64.zip
unzip -o /tmp/agy-acp.zip -d ~/.local/opt/agy-acp
chmod +x ~/.local/opt/agy-acp/agy_acp_server.par ~/.local/opt/agy-acp/localharness_external
xattr -dr com.apple.quarantine ~/.local/opt/agy-acp
cat > ~/.local/bin/agy_acp_server <<'EOF'
#!/bin/sh
exec "$HOME/.local/opt/agy-acp/agy_acp_server.par" "$@"
EOF
chmod +x ~/.local/bin/agy_acp_server
```

Linux and Windows use the same URL with `linux/...-linux-x86_64.zip` or `windows/...-windows-x86_64.zip`. `1.1.1` is the current ACP registry version and changes with releases, so check the registry if the download 404s.

If you would rather not add a wrapper, point the provider at the `.par` directly:

```json
{
  "agents": {
    "providers": {
      "agy": {
        "extends": "acp",
        "command": ["/Users/you/.local/opt/agy-acp/agy_acp_server.par"]
      }
    }
  }
}
```

The kernel keeps its own home at `~/.gemini/antigravity-acp/` (move it with `GEMINI_HOME`), separate from the `agy` CLI's `~/.gemini/antigravity-cli/`. Being signed in to the `agy` CLI does not sign in the ACP provider; the first connection asks you to sign in again.

The kernel accepts only HTTP and SSE MCP servers. Paseo's own tools are served over HTTP, so they work; stdio MCP servers configured for this provider are ignored.

## Adding or relabeling models

`models` replaces the model list entirely. `additionalModels` merges with runtime-discovered models (ACP) or with `models`, use it to add an extra entry or relabel a discovered one without redeclaring the full list. An entry with the same `id` as a discovered model updates it in place.

```json
{
  "agents": {
    "providers": {
      "gemini": {
        "extends": "acp",
        "label": "Google Gemini",
        "command": ["gemini", "--acp"],
        "additionalModels": [
          { "id": "experimental-model", "label": "Experimental", "isDefault": true },
          { "id": "gemini-2.5-pro", "label": "Gemini 2.5 Pro (preferred)" }
        ]
      }
    }
  }
}
```

## Disabling a provider

```json
{
  "agents": {
    "providers": {
      "copilot": { "enabled": false }
    }
  }
}
```

## Full reference

For the complete field reference (`extends`, `label`, `command`, `env`, `models`, `additionalModels`, `disallowedTools`, `paseoTools`, `enabled`, `order`), model and thinking-option schemas, and deeper examples for each plan, see [docs/custom-providers.md](https://github.com/getpaseo/paseo/blob/main/docs/custom-providers.md) on GitHub. See [Limit Paseo tools by provider](/docs/mcp#limit-paseo-tools-by-provider) for `paseoTools` configuration.
