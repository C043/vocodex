# Contributing to VOCODEX

Thank you for considering contributing to VOCODEX!

## How Can I Contribute?

### Reporting Bugs

- Check if the bug has already been reported in the Issues
- If not, create a new issue with a clear title and description
- Include steps to reproduce, expected behavior, and actual behavior
- Add relevant logs, screenshots, or error messages

### Suggesting Features

- Open an issue with the enhancement label
- Clearly describe the feature and why it would be useful
- Provide examples or mockups if applicable

### Contributing Code

1. Fork the repository and create a new branch from develop
2. Make your changes following the code style of the project
3. Write tests for your changes (required for new features)
4. Test your changes locally using the development setup
5. Commit your changes with clear, descriptive commit messages
6. Push to your fork and submit a pull request to the develop branch

## Development Setup

Follow the instructions in the README.md under "Development Setup" to get started.

## Testing

Before submitting a PR, ensure all tests pass:

```bash
# Test the backend
sudo docker compose exec backend pytest
```

New features must include tests to maintain code quality and prevent regressions.

## Commit Messages

Write clear, descriptive commit messages that explain what changed and why:

- Good: "Add voice selection dropdown to settings page"
- Good: "Fix audio sync issue when changing playback speed"
- Bad: "Update code"
- Bad: "Fix bug"

## Pull Request Process

1. Ensure your code follows the existing code style
2. Update documentation if you're changing functionality
3. Add tests for new features
4. All tests must pass
5. A maintainer will review your PR and may request changes
6. Once approved, your PR will be merged

## Code Style

### Python (Backend)
- Follow PEP 8 guidelines
- Use meaningful variable and function names
- Add docstrings to functions and classes

### TypeScript/React (Frontend)
- Use functional components with hooks
- Follow existing component structure
- Use meaningful variable names

## Questions?

Feel free to open an issue with the question label if you need help.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
