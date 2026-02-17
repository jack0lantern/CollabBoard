# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e5]:
    - heading "Log in" [level=1] [ref=e6]
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]: Email
        - textbox "Email" [ref=e10]: test-account@example.com
      - generic [ref=e11]:
        - generic [ref=e12]: Password
        - textbox "Password" [ref=e13]: test-password
      - paragraph [ref=e14]: "Firebase: Error (auth/user-not-found)."
      - button "Sign in" [ref=e15] [cursor=pointer]
    - generic [ref=e20]: or
    - button "Sign in with Google" [ref=e21] [cursor=pointer]
    - paragraph [ref=e22]:
      - text: Don't have an account?
      - link "Sign up" [ref=e23] [cursor=pointer]:
        - /url: /signup
    - link "← Back" [ref=e24] [cursor=pointer]:
      - /url: /
  - alert [ref=e25]
```