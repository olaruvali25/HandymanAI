# Troubleshooting

## Fast checklist

1. **Auth broken?**
   - Confirm `NEXT_PUBLIC_CONVEX_URL` is set in `.env.local`
   - Confirm Convex env vars are set: `SITE_URL`, `CONVEX_SITE_URL`, `JWT_PRIVATE_KEY`, `JWKS`

2. **OAuth buttons fail?**
   - Confirm Convex env vars are set for that provider:
     - Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
     - Facebook: `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`

3. **AI endpoints 500?**
   - Confirm `OPENAI_API_KEY` is set in `.env.local`
   - If you see model errors, set `OPENAI_MODEL` explicitly

4. **Styling weird / Tailwind errors?**
   - See `docs/errors.md`

## Known issues / fixes

See `docs/errors.md` for fixes already discovered in this repo.
