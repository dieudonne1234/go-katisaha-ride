<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Password recovery lets the auth SDK consume implicit/PKCE callbacks exactly once; manually verify only token hashes, require a recovery link/event, and sign out after updating before fresh sign-in to avoid reusing consumed links or unrelated sessions.
- Passenger recommendations interpret requests through server-only AI SDK Responses calls, then filter and rank live public schedules deterministically; never trust generated schedule details or book automatically.
- Passenger screens share accessible loading and explicit retry states; retry reads after ambiguous booking/payment failures rather than automatically repeating writes to avoid duplicate reservations or charges.
