---
layout: single
title: Autenticación con Auth0 en Rails
published: true
description: "Qué es Autenticación? Cómo podemos hacerlo en Rails? En qué nos ayuda Auth0 para esto?"
date: 2019-10-10T00:00:00.000Z
tags: ruby rails auth0 authentication
---

## Auth0 como una solución de Autenticación

### ¿Autenticación?

Primero definamos **autenticación** como la forma en que un usuario o un recurso en general se puede identificar en tu aplicación, es decir, una forma de reconocer que ese recurso en particular está interactuando con nuestra aplicación.

### ¿Cómo se puede autenticar en aplicaciones hechas en Rails?

La forma más conocida de autenticación es a través de un formulario con un campo para un email y otro para una contraseña. Esta forma podemos hacerla con Rails puro, pero tenemos que tener en cuenta la seguridad con que guardamos ese información, porque es información personal del usuario

Existen muchas otras formas de autenticación, como la que se está haciendo más conocida en los últimos años: a través de redes sociales. Y si nuestra aplicación en Rails solo es una API, entonces tenemos otras opciones con los JWT (Json Web Tokens). Esto lo dejaremos como tema para otro artículo.

### ¿Qué solución nos da Auth0?

Cómo mencioné antes, hay muchas formas en las que un usuario se puede identificar en nuestra aplicación. 
Mientras más opciones le demos al usuario, será más fácil para este usuario autenticarse en nuestra aplicación. 
En rails existen gemas para cada opción que queramos implementar. Pero, esto significa una configuración para cada una.

Auth0 nos da una solución a esto. 
Nos dará una forma segura de hacer solo una configuración en nuestra aplicación y a través de su plataforma elegir qué opciones (identity providers) queremos darle a nuestros usuarios. 
Y si al inicio aún no sabemos qué opciones les podemos dar, las podríamos ir agregando con el tiempo sin necesidad de volver a cambiar nuestro código.
Pueden encontrar un poco más de información sobre auth0 por aquí: [https://github.com/auth0/omniauth-auth0#what-is-auth0](https://github.com/auth0/omniauth-auth0#what-is-auth0)


## Demo Time!

Haremos una aplicación de prueba para integrar Auth0, esta aplicación solo tendrá los features de inicio y cierre de sesión.

### Configuración en la plataforma de Auth0

- Primero nos [crearemos](https://auth0.com/signup) una cuenta en **Auth0** o nos loguearemos si ya tenemos una cuenta.
  - Si ya tenemos una cuenta, podemos crear una nueva aplicación para este ejemplo
    - Las aplicaciones estarán en el menu **Applications**, en el sub menú **Applications**, escoger **Regular Web Application** como tipo de aplicación
  - Si nos hemos creado una cuenta para hacer este ejemplo, podemos usar la aplicación inicial que tenemos.
    - En nuestra **Default Application**, podemos cambiar el tipo de aplicación en la sección **Application Properties**, en el campo **Application Type** escogemos **Regular Web Application** y guardamos los cambios.
    -  Asegurémonos que en el campo **Token Endpoint Authentication Method** esté **POST** como opción seleccionada.
  - Ahora configuremos algunos campos que necesitaremos para la integración con nuestra aplicación en Rails. En la sección **Application URIs**, cambiemos estos campos con los siguientes valores:
    - Allowed Callback URLs: http://localhost:3000/auth/auth0/callback
      - Este es la URL donde el usuario será redirigido una vez se haya autenticado o no (errores) en Auth0.
    - Allowed Logout URLs: http://localhost:3000
      - Esta es la URL donde el usuario sin sesión será redirigido una vez que termine su sesión.
  - Además tenemos que seleccionar al menos una conexión para nuestra aplicación, es decir selección una opción de autenticación:
    - Nos vamos al tab **Connections** y habilitamos la opción **Username-Password-Authentication**

### Configuración base de Auth0 en nuestra aplicación

- Primero creamos nuestra aplicación en Rails si es que no la tenemos.
  - En mi caso, usé el comando rails new para crear una app de ejemplo. Estoy usando rails 7.0 con ruby 3.1.
- Agreguemos las gemas `omniauth-auth0` que nos ayuda con la configuración de **Auth0** y `omniauth-rails_csrf_protection` que nos ayuda con la protección CSRF en los requests de tipo OAuth.
- Ahora tenemos que agregar estas variables de entorno con los valores que tenemos en nuestra aplicación en la plataforma de Auth0:
    ```
    AUTH0_CLIENT_ID=
    AUTH0_CLIENT_SECRET=
    AUTH0_DOMAIN=
    ```
  - Para manejar las variables de entorno, usaré la gema `dotenv-rails`. Con esta gema puedes tener un archivo `.env` el que guardes todas tus variables de entorno.

- Creamos un archivo para la configuración inicial de Auth0, este debe estar en la carpeta `config/initializers` con el nombre `auth0.rb`
  - O puedes ejecutar este comando: `touch config/initializers/auth0.rb`
- Agregar la siguiente configuración en el archivo:
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
  - En `authorize_params` estamos diciendo a Auth0 qué información queremos que nos devuelva. Por [aquí](https://github.com/auth0/omniauth-auth0#additional-authentication-parameters), podrán ver algunos parámetros adicionales que podemos pasarle a este hash.

### Agregar el feature de Inicio de Sesión
- Primero agregaremos las siguientes rutas en `routes.rb`:
    ```rb
    scope "/auth" do
      get "/auth0/callback", to: "auth0#callback"
      get "failure", to: "auth0#failure"
    end
    ```
- Creamos el controller para las acciones de auth0:
  - touch app/controllers/auth0_controller.rb
- Dentro del controller, vamos a definir las acciones `callback` y `failure`:
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
  - En la acción **callback**, estoy leyendo la información que me llega en el request con la key `omniauth.auth`. Este nos dará un hash con un key `extra` que tiene un hash como valor y dentro de este hash tenemos otro hash en el key `raw_info`.
    - Para más información sobre el hash que nos llega: https://github.com/auth0/omniauth-auth0#authentication-hash
  - Una vez que tenemos esta info del usuario que nos dió Auth0, lo guardaremos en la sesión del usuario y redirigimos a la página que queremos que vea el usuario logueado. (Creen cualquier página que quieran, yo generé un scaffold de posts)
  - En la acción **failure**, estamos guardando en una variable de clase el mensaje del error que nos envia Auth0, y allí podemos hacer un redirect o un render de una página de error custom que queramos en nuestra app.
- Ahora agreguemos el button para iniciar sesión dentro del layout principal, este está en `views/layouts/application.html.erb`
    ```erb
    <%= button_to "Login", "/auth/auth0", method: :post, data: { turbo: false } %>
    ```
  - Le agregué `data: {turbo: false}` porque los botones en Rails por defecto usan turbo, y lo estoy desactivando en este caso en particular. Tendrás que hacer lo mismo si tu aplicación usa `turbolinks`.
- En el `ApplicationController`, agregaremos un helper llamado `current_user` para poder llamar al usuario logueado.
    ```rb
    helper_method :current_user
    def current_user
      session[:user_info]
    end
    ```
- Ahora actualizamos el `button_tag` que usamos hace un momento, para que se muestre solo si no existe el `current_user`, es decir si no hay usuario logueado:
    ```rb
    <% if current_user %>
      Hi <%= current_user["name"] %>
    <% else %>
      <%= button_to "Login", "/auth/auth0", method: :post, data: { turbo: false } %>
    <% end %>
    ```

### Agregar el feature de Cierre de Sesión
- Definamos la acción `logout` en nuestras rutas y en `Auth0Controller`:
    ```rb
    # routes.rb inside de /auth scope
    get '/auth/logout' => 'auth0#logout'

    # Auth0Controller
    def logout
      reset_session
      redirect_to logout_url
    end
    ```
  - El método `reset_session`, borrará todo lo que tenemos guardado en sesión
  - Y redirigimos a un url de logout que vamos a generar.
- Crearemos un método privado para generar esta URL:
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
- Finalmente, agregaremos el button para cerrar sesión en nuestro application layout:
    ```erb
    <%= button_to "Logout", "auth/logout", method: :get, data: { turbo: false } %>
    ```

Ahora probemos cómo funciona nuestra app!
