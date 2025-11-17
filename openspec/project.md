# Project Context

## Purpose
Dokploy is a free, self-hostable Platform as a Service (PaaS) that simplifies the deployment and management of applications and databases. It provides:
- Multi-language application deployment (Node.js, PHP, Python, Go, Ruby, etc.)
- Database management (MySQL, PostgreSQL, MongoDB, MariaDB, Redis)
- Docker Compose support for complex applications
- Multi-node scaling using Docker Swarm
- Real-time monitoring and resource management
- Automated backups and notifications
- Self-hosted alternative to Vercel, Heroku, and Netlify

## Tech Stack

### Frontend
- **Next.js 15.3.2** - React framework with App Router
- **React 18.2.0** - UI library
- **TypeScript 5.8.3** - Strict mode enabled
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Radix UI** - Headless UI components
- **shadcn/ui patterns** - Component patterns
- **Lucide React** - Icon library
- **TanStack Query (React Query)** - Data fetching and state management
- **React Hook Form + Zod** - Form handling and validation
- **CodeMirror** - Code editor integration
- **XTerm.js** - Terminal emulation

### Backend
- **tRPC 10.45.2** - End-to-end typesafe APIs
- **Drizzle ORM 0.39.3** - TypeScript ORM
- **PostgreSQL 3.4.4** - Database (via postgres package)
- **Better Auth** - Authentication system
- **BullMQ** - Job queue and scheduling
- **Dockerode** - Docker API client
- **SSH2** - Remote server management
- **Node-PTY** - Terminal process management
- **Pino** - Logging
- **Zod 3.25.32** - Schema validation

### AI Integration
- Multiple AI SDK providers (Anthropic, Azure, OpenAI, Mistral, Cohere, etc.)
- Ollama support for local LLMs

### Infrastructure
- **Docker** - Containerization
- **Docker Swarm** - Multi-node orchestration
- **Traefik** - Reverse proxy and load balancing
- **Node.js 20.16.0** - Runtime environment
- **pnpm 9.12.0** - Package manager

### Development Tools
- **Biome 2.1.1** - Linting and formatting
- **Vitest** - Testing framework
- **esbuild** - Bundler
- **TSX** - TypeScript execution
- **Lefthook** - Git hooks manager
- **Commitlint** - Commit message linting

## Project Conventions

### Code Style
- **Formatter**: Biome (NOT Prettier)
- **Linter**: Biome with custom rules (see biome.json)
- **TypeScript**: Strict mode with `noUncheckedIndexedAccess`
- **Import Organization**: Automatic via Biome
- **Key Rules**:
  - No unused imports (error)
  - No unused function parameters (error)
  - No parameter reassignment (error)
  - Use const assertions where applicable
  - Self-closing elements required
  - Single var declarator per statement
- **Line Length**: Managed by Biome
- **Pre-commit**: Automatic formatting via lint-staged and lefthook

### Architecture Patterns
- **Monorepo Structure**: pnpm workspaces
  ```
  apps/
    dokploy/        # Main Next.js application
    api/            # API service
    schedules/      # Scheduling service
    monitoring/     # Monitoring service
  packages/
    server/         # Shared backend code (@dokploy/server)
  ```
- **API Layer**: tRPC for type-safe client-server communication
- **Database**: Drizzle ORM with migration system
- **State Management**: TanStack Query for server state, React hooks for client state
- **Component Structure**: Radix UI primitives with custom styling
- **Path Aliases**:
  - `@/*` - App root
  - `@dokploy/server/*` - Server package
- **Build System**:
  - Next.js for frontend
  - esbuild for server code
  - Custom build scripts for production

### Testing Strategy
- **Framework**: Vitest
- **Location**: `__test__/` directory in apps/dokploy
- **Test Files**: `*.test.ts` pattern
- **Config**: `__test__/vitest.config.ts`
- **Pool**: forks (for isolation)
- **Coverage**: Tests focus on compose configuration, domain logic, and critical paths
- **Run Command**: `pnpm test`

### Git Workflow
- **Main Branch**: `canary` (NOT main) - source of truth for development
- **Production Branch**: `main` - latest stable release
- **Commit Convention**: Conventional Commits (enforced by commitlint)
  - `feat:` - New features
  - `fix:` - Bug fixes
  - `docs:` - Documentation changes
  - `style:` - Code style changes (formatting, etc.)
  - `refactor:` - Code refactoring
  - `perf:` - Performance improvements
  - `test:` - Test changes
  - `build:` - Build system changes
  - `ci:` - CI configuration changes
  - `chore:` - Other changes
- **PR Target**: All PRs merge to `canary`
- **PR Requirements**:
  - Clear description
  - Single, well-defined problem/feature
  - Reference related issues
  - Include screenshots/videos when applicable
  - Update documentation if needed
- **Pre-commit Hooks**: Biome check via lefthook

## Domain Context

### PaaS Concepts
- **Applications**: User-deployed services with various build methods (Nixpacks, Buildpacks, Dockerfile)
- **Databases**: Managed database instances with backup/restore capabilities
- **Docker Compose**: Multi-container application definitions
- **Projects**: Organizational units containing applications and databases
- **Deployments**: Build and deployment history tracking
- **Templates**: Pre-configured application stacks (Plausible, Pocketbase, Cal.com, etc.)
- **Multi-node**: Docker Swarm cluster management across multiple servers
- **Monitoring**: Real-time CPU, memory, storage, and network metrics
- **Domains**: Custom domain configuration with automatic SSL via Traefik

### Docker Integration
- Heavy use of Dockerode for container management
- Docker Swarm for orchestration
- Traefik for automatic routing and load balancing
- Volume management for data persistence
- Network configuration for service communication

### Build Systems
- **Nixpacks**: Nix-based automatic build system
- **Buildpacks**: Cloud Native Buildpacks
- **Dockerfile**: Custom Dockerfile support
- **Railpack**: Custom build system

### Security
- Authentication via Better Auth
- 2FA support (TOTP)
- SSH key management for remote servers
- Secure environment variable handling
- Docker socket access control

## Important Constraints

### Technical Constraints
- **Node.js Version**: Must use v20.16.0 (exact version required)
- **pnpm Version**: >=9.12.0
- **Docker Required**: Docker daemon must be available
- **PostgreSQL**: Required for database
- **Platform**: Linux-based deployments (VPS/server environment)
- **TypeScript**: Strict mode, no explicit any when possible
- **Biome Only**: Do not use Prettier or other formatters

### Development Constraints
- Changes should not break Docker integration
- Maintain backward compatibility with existing deployments
- Database migrations must be reversible when possible
- Always test with real Docker containers in development
- Consider multi-node/swarm implications for new features

### Performance Constraints
- Real-time monitoring data must be efficient
- Terminal sessions (via node-pty) must handle multiple concurrent users
- Build processes run in separate processes to avoid blocking
- Database queries should be optimized (use Drizzle's query builder properly)

## External Dependencies

### Required Services
- **Docker Engine** - Core containerization platform
- **PostgreSQL** - Primary database (via DATABASE_URL)
- **Traefik** - Reverse proxy (auto-configured)

### Optional Integrations
- **GitHub** - Repository integration via Octokit
- **Stripe** - Payment processing for cloud offering
- **Email Services** - SMTP via Nodemailer for notifications
- **Notification Services**:
  - Slack
  - Discord
  - Telegram
  - Email
- **AI Providers** - Multiple LLM providers for AI features

### Build Tools (Optional)
- **Nixpacks** - Automatic build detection
- **Buildpacks (Pack CLI)** - Cloud Native Buildpacks
- **Railpack** - Custom build system

### Remote Server Management
- **SSH2** - Remote server connections
- **Public IP Detection** - For domain configuration

### Monitoring & Logging
- **node-os-utils** - System metrics
- **Pino** - Structured logging
- **BullMQ** - Job scheduling and queues (requires Redis)
