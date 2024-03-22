## Deploying to Fly.io

1. [Install Fly](https://fly.io/docs/getting-started/installing-flyctl/).

   > **Note**: Try `flyctl` instead of `fly` if the commands below won't work.

2. Sign up and log in to Fly:

   ```sh
   fly auth signup
   ```

   > **Note**: If you have more than one Fly account, ensure that you are signed
   > into the same account in the Fly CLI as you are in the browser. In your
   > terminal, run `fly auth whoami` and ensure the email matches the Fly
   > account signed into the browser.

If first deployment:

3. Create two apps on Fly, one for staging and one for production: We want Fly
   to use our Dockerfile. You can either build the docker image locally or let
   Fly's remote docker builders build it for you. I recommend building it
   locally first, to ensure the Docker builds correctly.

   Note: These commands are run from the root workspace. This follows our
   guiding principle in our root README.md.

   Build locally:
   `docker build --file {PATH_TO_DOCKERFILE} --build-arg PROJECT={YOUR_APP_NAME} --build-arg STORE_PATH=$(pnpm store path) -t {FLY_APP_NAME}:main-$(git rev-parse HEAD) .`

   Launch without deploying using our local image:
   `fly launch --dockerfile {PATH_TO_DOCKERFILE} --build-arg PROJECT={YOUR_APP_NAME} --build-arg STORE_PATH=$(pnpm store path) --name {FLY_APP_NAME}  --local-only --path {PATH_TO_DIR_CONTAINING_FLY_TOML} --image {FLY_APP_NAME}:main$(git rev-parse HEAD) --no-deploy`

   Then do the same steps for staging, just change `main` in the commands above.

   NOTE: `fly launch` overwrites the `fly.toml` and there's on way to disable it
   as of time of writing. You can safely ignore and undo the changes.

   NOTE: At this stage, your apps aren't running and deployed yet due to
   `--no-deploy`.

4. Initialize Git.

   ```sh
   git init
   ```

- Create a new [GitHub Repository](https://repo.new), and then add it as the
  remote for your project. **Do not push your app yet!**

  ```sh
  git remote add origin <ORIGIN_URL>
  ```

5. Add secrets:

- Add a `FLY_API_TOKEN` to your GitHub repo. To do this, go to your user
  settings on Fly and create a new
  [token](https://web.fly.io/user/personal_access_tokens/new), then add it to
  [your repo secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
  with the name `FLY_API_TOKEN`.

- Add a `SESSION_SECRET`, `INTERNAL_COMMAND_TOKEN`, and `HONEYPOT_SECRET` to
  your fly app secrets, to do this you can run the following commands:

  ```sh
  fly secrets set SESSION_SECRET=$(openssl rand -hex 32) INTERNAL_COMMAND_TOKEN=$(openssl rand -hex 32) HONEYPOT_SECRET=$(openssl rand -hex 32) --app [FLY_APP_NAME]
  fly secrets set SESSION_SECRET=$(openssl rand -hex 32) INTERNAL_COMMAND_TOKEN=$(openssl rand -hex 32) HONEYPOT_SECRET=$(openssl rand -hex 32) --app [FLY_APP_NAME]-staging
  ```

  > **Note**: If you don't have openssl installed, you can also use
  > [1Password](https://1password.com/password-generator) to generate a random
  > secret, just replace `$(openssl rand -hex 32)` with the generated secret.

6. Create production database: Create a persistent volume for the sqlite
   database for both your staging and production environments. Run the following
   (feel free to change the GB size based on your needs and the region of your
   choice (`https://fly.io/docs/reference/regions/`). If you do change the
   region, make sure you change the `primary_region` in fly.toml as well):

   ```sh
   fly volumes create litefs --region sjc --size 2 --app [FLY_APP_NAME]
   fly volumes create litefs --region sjc --size 2 --app [FLY_APP_NAME]-staging
   ```

7. Attach Consul:

- Consul is a fly-managed service that manages your primary instance for data
  replication
  ([learn more about configuring consul](https://fly.io/docs/litefs/getting-started/#lease-configuration)).

  ```sh
  fly consul attach --app [FLY_APP_NAME]
  fly consul attach --app [FLY_APP_NAME]-staging
  ```

If not first deployment:

8. Commit!

   The Epic Stack comes with a GitHub Action that handles automatically
   deploying your app to production and staging environments.

   Now that everything is set up you can commit and push your changes to your
   repo. Every commit to your `main` branch will trigger a deployment to your
   production environment, and every commit to your `dev` branch will trigger a
   deployment to your staging environment.
