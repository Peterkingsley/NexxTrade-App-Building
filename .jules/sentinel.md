## 2025-02-06 - Path Traversal in Custom File Server
**Vulnerability:** Path Traversal in `/uploads/:filename` route.
**Learning:** Manual path construction using `path.join(uploadsDir, filename)` with unsanitized `req.params` allows attackers to escape the intended directory using `..` sequences.
**Prevention:** Use Express's `res.sendFile(filename, { root: uploadsDir })` which has built-in protection against directory traversal, and always validate or sanitize user-provided filenames.
