# API Key Configuration

This project requires two API keys. Both are configured in `backend/.env`.

## USDA FoodData Central API Key

Used to fetch nutritional data for ingredients.

1. Go to https://fdc.nal.usda.gov/api-key-signup.html
2. Fill out the registration form (name, email)
3. You'll receive an API key via email
4. Add it to `backend/.env`:
   ```
   USDA_API_KEY=your_usda_api_key_here
   ```

The USDA API is free with a rate limit of 3,600 requests per hour.

## OpenAI API Key

Used for GPT-4o-mini to parse raw recipe text into structured ingredients.

1. Sign up at https://platform.openai.com
2. Navigate to API Keys in your account settings
3. Click "Create new secret key"
4. Add it to `backend/.env`:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

OpenAI charges per token. GPT-4o-mini is cost-effective at approximately $0.15 per 1M input tokens.

## Security Notes

- Never commit `.env` files to version control (already in `.gitignore`)
- For production deployment on Railway, add environment variables through the Railway dashboard
- Rotate keys immediately if accidentally exposed
