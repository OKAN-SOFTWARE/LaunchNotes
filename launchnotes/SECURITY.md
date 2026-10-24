# Security and privacy notes

LaunchNotes is a local release-note helper. It is not a secure source-code auditor or a hosted product. It has not received an independent security audit.

## What it does

The browser reads only the text you paste. The static server binds to the IPv4 loopback address and has a fixed route allowlist; it contains no API or write route. The app does not use network requests from the browser, analytics, browser storage, or external packages. Pasted text is rendered with text nodes. The CLI reads a user-selected local commit-message file and refuses to overwrite output.

## What it does not do

It does not access your Git repository automatically; it does not read files or run commands. It does not send messages to GitHub or publish releases. It does not inspect your commit history for secrets or decide which messages are appropriate for public release. A local network request made by your own machine is not the same as confidentiality against malware, browser extensions, or other local software.

Commit history sometimes reveals project names, customer names, ticket numbers, or internal details. Review both input and output before publishing. Do not paste credentials, private customer information, or confidential commit text into a public release.

Version suggestions are not authoritative. SemVer edge cases, prereleases, multiple release channels, and project-specific rules are outside scope. The CLI output path should be a new file; existing files are never overwritten.

If you discover a security concern, report it privately to the maintainer if GitHub private vulnerability reporting is enabled. Avoid including confidential commit messages in a public issue.
