---
layout: single
title: Authentication with Auth0 on Rails
published: true
description: "What is Authentication? how can we implement it in Rails? How Auth0 help us with this?"
date: 2022-03-08T00:00:00.000Z
tags: ruby rails auth0 authentication
---

One of the essential features that most applications have in common is Authentication.
There are many options to authenticate us nowadays. In this article, I’ll talk about a solution used a lot lately: Auth0 and implementing it in a Rails project.

## Auth0 as an Authentication Solution

### Authentication?
First, let's define **authentication** as to how a user or a resource, in general, can be identified in your application, which means it is a way to recognize that a particular resource (user) is interacting with our application.

### How to authenticate in Rails applications?
The authentication’s most known way is a form with a field for an email and another for a password. We can do it with only Rails, but we need to consider the security of storing this information because it is the user's personal information.

There are many other ways of authentication, such as the one which is becoming more known last years: through social media apps. And, if our Rails application is API only, then we have other options like `JWT` (JSON Web Tokens). But we will leave this as a topic for another article.

### What does Auth0 give us as a solution?
There are many ways in which a user can identify itself in our application. The more options the user has, the easier it will be to authenticate and use our application. In Rails, there are gems for each option we want to implement. This means a configuration for each one.

Auth0 gives us a solution to this problem. Auth0 offers us one way to make only one configuration in our application, and in its platform, we could choose what options (also known as identity providers) we want to give to our users. And, if we don’t know what options our users need to authenticate at the beginning, we could add them later without the necessity of changing our codebase.

You can find more info here: https://github.com/auth0/omniauth-auth0#what-is-auth0

## Demo Time!
We’re going to integrate Auth0 in an application. This demo only will have two features: login and logout.

### Configuration in Auth0 platform
- First, let’s [register](https://auth0.com/signup) in Auth0 or log in if we already have an account.
  - We can create a new application for this demo if we already have an account.
    - Applications will be in the `Applications` menu, in the `Applications` submenu, choose `Regular Web Application` as the application type.
  - If we have created a new account for this demo, we can use the default application in Auth0.
    - In our `Default Application`, we can change the application typo in the`Application Properties` section in the `Application Type` field. Choose `Regular Web Application` and save the changes.
    - Let’s ensure that the `Token Endpoint Authentication Method` field is `POST` as the selected option.
  - Now let’s configure some fields we will need to integrate our Rails app. In the `Application URIs` section, we will change these fields with the following values:
    - Allowed Callback URLs: `http://localhost:3000/auth/auth0/callback`
      - URL where the user will be redirected after being authenticated or not (return errors) in Auth0.
    - Allowed Logout URLs: `http://localhost:3000`
      - URL where the user without session will be redirected after his session finish.
  - Also, we have to select at least one connection for our app, which means select one option for authentication:
    - Go to the `Connections` tab and enable the `Username-Password-Authentication` option.

### Base Configuration of Auth0 in our app
- Let’s create our Rails app if we don’t have one already.
  - In my case, I used the `rails new` command to create a demo app. I’m using rails 7.0 and ruby 3.1.
- Add the `omniauth-auth0` gem, which helps us with the Auth0 configuration in the OAuth process, and the `omniauth-rails_csrf_protection` gem, which helps us with the CSRF protection in the OAuth requests.
- Now, we have to add these environment variables with the values we have in our app in the Auth0 platform:
  ```
  AUTH0_CLIENT_ID
  AUTH0_CLIENT_SECRET
  AUTH0_DOMAIN
  ```
    - I will use the `dotenv-rails` gem to handle the environment variables. With this gem, you can have a `.env` file to save all the environment variables needed in your application.
- To the initial configuration of Auth0, we need to create a file called `auth0.rb` in the `config/initializers` folder:
  - Or you can run this command: `touch config/initializers/auth0.rb`
- Add the following configuration in the file:
    ```rb
    Rails.application.config.middleware.use OmniAuth::Builder do
     provider(
       :auth0,
       ENV["AUTH0_CLIENT_ID"],
       ENV["AUTH0_CLIENT_SECRET"],
       ENV["AUTH0_DOMAIN"],
       callback_path: "/auth/auth0/callback",
       authorize_params: { scope: "openid profile" }
     )
    end
    ```
  - In `authorize_params`, we tell Auth0 what info of the user we want Auth0 to give us. [Here](https://github.com/auth0/omniauth-auth0#additional-authentication-parameters) you can see some additional params we can pass in this hash.

### Add the Login Feature
- First, let’s add the following routes in `routes.rb`:
    ```rb
    scope "/auth" do
      get "/auth0/callback", to: "auth0#callback"
      get "failure", to: "auth0#failure"
    end
    ```
- Let’s create the controller for the action of Auth0:
    `touch app/controllers/auth0_controller.rb`
- Inside the controller, let’s define the `callback` and `failure` actions:
    ```rb
    def callback
      info = request.env['omniauth.auth']
      session[:user_info] = info['extra']['raw_info']
      redirect_to posts_path
    end

    def failure
      @error_msg = request.params['message']
    end
    ```
  - In the `callback` action, we’re reading the information I receive from the request with the key `omniauth.auth`. This value will be a hash with a key `extra` which has a hash as a value and inside this hash, we have a key `raw_info`.
    - For more info about the hash we receive: https://github.com/auth0/omniauth-auth0#authentication-hash
  - Once we have the user’s info given by Auth0, we will save it in the user session and redirect to the page we want the logged user to see (this could be any page, I generated a scaffold for `posts` and used `posts#index`)
  - In the `failure` action, we’re storing in a class variable the error message Auth0 sent, and then we can redirect the user or render a custom error page we want in our app.
- Now we’ll add the login button inside the main layout, this is in `views/layouts/application.html.erb`
    ```erb
    <%= button_to "Login", "/auth/auth0", method: :post, data: { turbo: false } %>
    ```
  - I added `data: { turbo: false }` because the Rails buttons use `turbo` by default, and I’m deactivating in this particular case. You will have to make the same if your application use `turbolinks`.
- In the `ApplicationController`, we’ll add a helper called `current_user` to can call the logged user.
    ```rb
    helper_method :current_user
    
    def current_user
      session[:user_info]
    end
    ```
- Now, let’s update the button_tag we use before to only show it if the `current_user` doesn’t exist, that means if there’s no logged user:
    ```erb
    <% if current_user %>
      Hi <%= current_user["name"] %>
    <% else %>
      <%= button_to "Login", "/auth/auth0", method: :post, data: { turbo: false } %>
    <% end %>
    ```

### Add the Logout feature
- Let’s define the logout action in our routes and `Auth0Controller`:
    ```rb
    # routes.rb inside de /auth scope
    get '/auth/logout' => 'auth0#logout'
    
    # Auth0Controller
    def logout
      reset_session
      redirect_to logout_url
    end
    ```
  - The `reset_session` method, will delete all we have stored in the session
  - And we redirect to a logout URL we’ll generate.
- We’ll create a private method to generate this logout URL:
    ```rb
    def logout_url
      request_params = { returnTo: post_url, client_id: ENV["AUTH0_CLIENT_ID"] }
      URI::HTTPS.build(
        host: ENV["AUTH0_DOMAIN"], path: "/v2/logout", query: to_query(request_params)
      ).to_s
    end
    
    def to_query(hash)
      hash.map { |k, v| "#{k}=#{CGI.escape(v)}" unless v.nil? }.compact.join("&")
    end
    ```
- Finally, we’ll add the logout button in our `application/layout`:
    ```erb
    <%= button_to "Logout", "auth/logout", method: :get, data: { turbo: false } %>
    ```

Let’s try our app and that’s it! You now can implement Auth0 in a Rails app.
