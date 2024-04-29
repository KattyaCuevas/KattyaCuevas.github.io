---
layout: single
title: Buenas Practicas en Rails
published: true
description: "Buenas prácticas en Ruby on Rails para mantener la calidad y la coherencia del código. Explora la arquitectura avanzada, el rendimiento, la escalabilidad, la seguridad y las pruebas automatizadas en Rails."
date: 2024-04-29T00:00:00.000Z
tags: ruby rails buenas-practicas design-patterns
# header:
#   og_image: /assets/images/articles/buenas-practicas-en-rails.png
---

¿Por qué son tan importantes las buenas prácticas en Ruby on Rails o en cualquier proyecto?
Las razones son muchas pero 3 de las más importantes son:
- **Mantenimiento del código**: Un código bien estructurado y organizado es más fácil de mantener y de modificar. Esto es especialmente importante en proyectos a largo plazo.
- **Colaboración en equipo**: En proyectos con varios desarrolladores, seguir buenas prácticas ayuda a que todos los miembros del equipo puedan entender y trabajar en el código de los demás. Y si tu equipo aún es pequeño, seguir buenas prácticas te ayudará a que cuando crezca, la transición sea más sencilla.
- **Calidad del código**: Las buenas prácticas ayudan a prevenir errores y vulnerabilidades de seguridad, lo que se traduce en un código más robusto y confiable. Además, facilitan la detección y corrección de errores.

## Rails es mágico, pero no adivino
Ruby on Rails es un framework que fomenta muchas buenas prácticas por defecto. Una clara muestra de ello es:
- Rails sigue el patrón de diseño Modelo-Vista-Controlador (MVC) y tiene una estructura de archivos y carpetas predefinida que facilita la separación de preocupaciones. Esto es un gran punto a favor del principio de responsabilidad única.
- Rails sigue el principio convención sobre la configuración, lo que significa que sigue ciertas convenciones y buenas prácticas por defecto. Por ejemplo, Rails espera que los nombres de las tablas de la base de datos estén en plural y en minúsculas, y que los nombres de las clases de los modelos estén en singular y en mayúsculas.

Sin embargo, mientras más crezca tu proyecto, más probable es que necesites personalizar y extender la funcionalidad de Rails, o que necesites integrar otras gemas o servicios. En estos casos, es importante conocer y seguir buenas prácticas para mantener la calidad y la coherencia del código.

## Buenas Prácticas con las que puedes empezar

### Arquitectura Avanzada
Una de las áreas en las que puedes profundizar es en la arquitectura avanzada de Rails. Algunos temas que puedes explorar son:
- **Patrones de diseño avanzados**: Rails ofrece muchas posibilidades para implementar patrones de diseño avanzados, como Service Objects, Decorators, etc. Estos patrones te ayudarán a mantener un código más limpio y modular.
- **Gemas especializadas**: Existen muchas gemas especializadas que pueden mejorar la arquitectura de tu aplicación, como Trailblazer, ViewComponent, Cells, etc. Estas gemas te permiten implementar funcionalidades avanzadas y mantener una arquitectura más escalable y mantenible.

#### Patrones de diseño avanzados
Los patrones de diseño son soluciones generales a problemas comunes en el diseño de software. Algunos patrones de diseño avanzados que puedes aplicar en Rails son:

- **Decorators**: Los Decorators son objetos que envuelven a otros objetos y añaden funcionalidades adicionales. Son útiles para añadir presentación y lógica de vista a tus modelos sin sobrecargarlos.
Ejemplo de Decorator en Rails:
```ruby
class ProductDecorator < SimpleDelegator
  def formatted_price
    number_to_currency(price)
  end
end
```

- **Policy Objects**: Los Policy Objects son objetos que encapsulan la lógica de autorización de tu aplicación. Son útiles para centralizar la lógica de autorización y mantener un código más limpio y reutilizable.
Ejemplo de Policy Object en Rails:
```ruby
class OrderPolicy
  def initialize(user, order)
    @user = user
    @order = order
  end

  def can_create?
    @user.admin? || @user == @order.user
  end
end
```

- **Presenters**: Los Presenters son objetos que encapsulan la lógica de presentación de tu aplicación. Son útiles para separar la lógica de presentación de los modelos y controladores, y para mantener un código más limpio y reutilizable.
Ejemplo de Presenter en Rails:
```ruby
class ProductPresenter
  def initialize(product)
    @product = product
  end

  def formatted_price
    number_to_currency(@product.price)
  end
end
```
- **Service Objects**: Los Service Objects son objetos que encapsulan la lógica de negocio de tu aplicación. Son útiles para separar la lógica de negocio de los controladores y modelos, y para mantener un código más limpio y modular.
Ejemplo de Service Object en Rails:
```ruby
class CreateOrderService
  def initialize(user, product)
    @user = user
    @product = product
  end

  def call
    order = @user.orders.create(product: @product)
    SendOrderConfirmationEmailJob.perform_later(order)
    order
  end
end
```
- **Query Objects**: Los Query Objects son objetos que encapsulan consultas complejas a la base de datos. Son útiles para mantener un código más limpio y reutilizable, y para separar la lógica de consulta de los modelos y controladores.
Ejemplo de Query Object en Rails:
```ruby
class ProductsQuery
  def initialize(relation = Product.all)
    @relation = relation
  end

  def cheap_products
    @relation.where('price < ?', 100)
  end
end
```

#### Gemas especializadas
Además de los patrones de diseño avanzados, existen muchas gemas especializadas que puedes utilizar en Rails para mejorar la arquitectura de tu aplicación. Algunas gemas especializadas que puedes explorar son:
- **Trailblazer**: Trailblazer es un framework que te ayuda a implementar patrones de diseño avanzados en Rails, como Services (Operation), Presenter, etc. Trailblazer te permite mantener una arquitectura más limpia y modular.
Ejemplo de Operation en Trailblazer:
```ruby
class CreateOrder < Trailblazer::Operation
  step :validate
  step :create_order

  def validate(ctx, params:, **)
    ctx[:order] = Order.new(params)
    ctx[:order].valid?
  end

  def create_order(ctx, order:, **)
    order.save
  end
end
```
- **ViewComponent**: ViewComponent es una gema que te ayuda a implementar componentes reutilizables en Rails. Los componentes de ViewComponent te permiten separar la lógica de presentación de los modelos y controladores, y a mantener un código más limpio y modular. Está inspirado en el concepto de componentes de React.
Ejemplo de componente en ViewComponent:
```ruby
class MessageComponent < ViewComponent::Base
  erb_template <<-ERB
    <h1>Hello, <%= @name %>!</h1>
  ERB

  def initialize(name:)
    @name = name
  end
end
```
- **Cells**: Cells es una gema que te ayuda a implementar celdas reutilizables en Rails. Las celdas de Cells te permiten encapsular la lógica de presentación en componentes reutilizables, y a mantener un código más limpio y modular.
Ejemplo de celda en Cells:
```ruby
class ProductCell < Cell::ViewModel
  def show
    model.name + ' ' + model.price
  end
end
```
```rb
<% @products.each do |product| %>
  <%= cell(ProductCell, product) %>
<% end %>
```

- **AASM**: AASM es una gema que te ayuda a implementar máquinas de estado en Rails. Esto te permiten modelar el comportamiento de tus modelos de forma más clara y modular, y a mantener un código más limpio y mantenible.
Ejemplo de máquina de estado en AASM:
```ruby
class Order < ApplicationRecord
  include AASM

  aasm do
    state :pending, initial: true
    state :confirmed, before_enter: :send_confirmation_email
    state :shipped
    state :delivered

    after_all_transitions :log_status_change

    event :confirm do
      transitions from: :pending, to: :confirmed
    end

    event :ship do
      after do
        send_shipping_notification
      end
      transitions from: :confirmed, to: :shipped
    end

    event :deliver do
      transitions from: :shipped, to: :delivered
    end
  end
end
```

Adicionalmente, la comunidad de Rails es muy activa y hay muchas gemas que pueden ayudarte a mejorar o avanzar rápidamente en tu proyecto. Una buena práctica es investigar y evaluar las gemas antes de integrarlas en tu proyecto, para asegurarte de que cumplen con tus necesidades y estándares de calidad. Y también recordar que muchas de las funcionalidades comunes entre proyectos ya tienen gemas que las implementan, y estas se dedican a mejorar y mantener esas funcionalidades, sobretodo en términos de seguridad.


### Rendimiento y Escalabilidad
Otro aspecto importante en el desarrollo de aplicaciones web es el rendimiento y la escalabilidad. Algunos temas que puedes explorar en este ámbito son:
- **Optimización de rendimiento**: Rails ofrece muchas posibilidades para optimizar el rendimiento de tu aplicación, como el uso eficiente de caché, la fragmentación de vistas, etc. Estas estrategias te ayudarán a mejorar la velocidad de carga de tu aplicación y la experiencia del usuario.
- **Arquitecturas escalables**: Si tu aplicación crece, es importante tener en cuenta la escalabilidad. Algunas estrategias para implementar arquitecturas escalables en Rails son el uso de microservicios, el sharding de la base de datos, etc.

#### Optimización de rendimiento
La optimización de rendimiento es un aspecto crítico en el desarrollo de aplicaciones web, ya que influye directamente en la experiencia del usuario y en la eficiencia de la aplicación. Algunas estrategias para optimizar el rendimiento de tu aplicación en Rails son:
- **Uso eficiente de caché**: Rails ofrece muchas posibilidades para implementar caché en tu aplicación, como el uso de fragmentos de caché, el uso de caché de página completa, etc. Estas estrategias te ayudarán a mejorar la velocidad de carga de tu aplicación y a reducir la carga en el servidor.
- **Optimización de activos estáticos**: Los activos estáticos, como JavaScript, CSS e imágenes, pueden afectar el rendimiento de tu aplicación si no se optimizan correctamente. Algunas estrategias para optimizar los activos estáticos en Rails son la minificación, la concatenación, la compresión, etc.
- **Uso de bases de datos eficientes**: La base de datos es uno de los componentes críticos en el rendimiento de una aplicación web. Algunas estrategias para optimizar el rendimiento de la base de datos en Rails son el uso de índices, la optimización de consultas, la fragmentación de tablas, etc.

### Seguridad en Profundidad
La seguridad es un aspecto crítico en el desarrollo de aplicaciones web, ya que cualquier vulnerabilidad puede comprometer la integridad y la confidencialidad de los datos de los usuarios. Algunos temas que puedes explorar en este ámbito son:
- **Análisis detallado de vulnerabilidades comunes**: Es importante conocer las vulnerabilidades comunes en aplicaciones web, como Cross-Site Scripting (XSS), Cross-Site Request Forgery (CSRF), SQL Injection, etc.
- **Herramientas avanzadas de seguridad**: Existen muchas herramientas avanzadas de seguridad que puedes utilizar en Rails, como Brakeman, Bundler Audit, etc. Estas herramientas te ayudarán a identificar y corregir vulnerabilidades de seguridad en tu aplicación. Si tienes tu aplicación en GitHub, tienes a dependabot que te ayuda a mantener tus dependencias actualizadas y seguras.

#### Análisis detallado de vulnerabilidades comunes
Es importante conocer las vulnerabilidades comunes en aplicaciones web para poder prevenirlas y mitigarlas. Algunas vulnerabilidades comunes en aplicaciones web son:
- **Cross-Site Scripting (XSS)**: El XSS es una vulnerabilidad que permite a un atacante ejecutar código malicioso en el navegador de un usuario. Para prevenir el XSS en Rails, es importante escapar y sanitizar las entradas del usuario y utilizar métodos seguros para renderizar HTML.
Ejemplos de prevención de XSS en Rails:
  - Siempre sanitizar las entradas del usuario antes de mostrarlas en la vista. Esto se puede hacer con el método `sanitize` o `html_safe`.
    ```ruby
    <%= sanitize @user.bio %>
    ```
  - Utilizar el link_to solo para enlaces internos y no para enlaces externos.
    ```ruby
    <%= link_to 'Home', root_path %>
    ```

- **Cross-Site Request Forgery (CSRF)**: El CSRF es una vulnerabilidad que permite a un atacante realizar acciones no autorizadas en nombre de un usuario autenticado. Para prevenir el CSRF en Rails, es importante utilizar tokens de autenticidad y verificar la autenticidad de las solicitudes. Rails proporciona protección contra CSRF por defecto, pero también permite deshabilitarla si es necesario.
Para verificar la autenticidad de las solicitudes en Rails, en el ApplicationController o el controlador base de tu aplicación, debe estar la siguiente línea:
```ruby
  protect_from_forgery with: :exception
```
Esto significa que Rails usa la estrategio `:exception` para protegerse de CSRF, que lanza un error si el request viene sin el token de autenticidad. Otra estrategia es `:null_session` que no lanza un error, pero limpia la sesión.
En muchas API hechas en Rails, se usaba el `skip_before_action :verify_authenticity_token` para deshabilitar la protección CSRF en los controllers que eran solo de la API.

- **SQL Injection**: El SQL Injection es una vulnerabilidad que permite a un atacante ejecutar consultas SQL maliciosas en la base de datos. Para prevenir el SQL Injection en Rails, es importante utilizar consultas parametrizadas y escapar las entradas del usuario. Aquí es importante usar los métodos de ActiveRecord que permiten hacer consultas seguras.

### Testing
Las pruebas automatizadas son una parte fundamental del desarrollo de software, ya que te permiten verificar el comportamiento de tu aplicación y prevenir errores. Algunos temas que puedes explorar en este ámbito son:
- **Pruebas unitarias**: Las pruebas unitarias te permiten verificar el comportamiento de unidades individuales de código, como modelos, controladores, etc.
- **Pruebas de integración**: Las pruebas de integración te permiten verificar el comportamiento de múltiples componentes de tu aplicación trabajando juntos.
- **Pruebas de aceptación**: Las pruebas de aceptación te permiten verificar el comportamiento de tu aplicación desde la perspectiva del usuario.

## Conclusión
En resumen, seguir buenas prácticas en Ruby on Rails es fundamental en muchos aspectos. Algunas áreas en las que puedes profundizar son la arquitectura avanzada, el rendimiento, la escalabilidad, la seguridad y las pruebas automatizadas.
Recuerda que la comunidad de Rails es muy activa y hay muchos recursos disponibles para seguir aprendiendo y mejorando en el desarrollo con Rails.
¡Sigue aprendiendo y mejorando en tu viaje con Ruby on Rails!

¡Gracias por leerme! ❤️
