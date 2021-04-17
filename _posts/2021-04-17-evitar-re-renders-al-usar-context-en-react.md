---
layout: single
title: Evitar Re-Renders al usar Context en React 
published: true
description: Cómo solucionar los re-renders cuando estamos usando Context en React.
date: 2021-04-17T01:00:00.000Z
tags: react
header:
  og_image: /assets/images/articles/evitar-re-renders-al-usar-context-en-react.png
---

Hace algunos meses, estaba haciendo un refactor en un proyecto de React y me quedé horas intentando resolver el problema. El refactor se debía a un problema típico de proyectos de React, pasar muchos props a los componentes hijos para así pasarlos a los hijos de estos y así.
Cuando este tipo de situaciones pasa, al querer actualizar alguno de los componentes o quizá solo quieras reutilizarlos en alguna otra parte, te obliga a tener información en tu nuevo componente que no necesitas en ese momento.

> English version [here](/articles/2021-04-17-fixing-re-renders-when-using-context-in-react)

En fin, al terminar el refactor, separé la información en varios contextos, para así solo compartir la data necesaria con los componentes que lo necesitaban. Aunque suena como un refactor exitoso, no lo era, mis componentes se seguían actualizando cuando actualizaba un estado de un contexto del que no dependían. No tiene sentido, ¿verdad?

Para explicar mi problema, pondré un ejemplo.
Tengo 3 componentes:
- `SessionForm`: Componente para agregar tu username. Si ya lo has ingresado, entonces te muestra un saludo y un botón para desloguearte (borrar el username). Si no lo has ingresado, te muestra un input para agregarlo.
- `SessionCounterMessage`: Componente que muestra un mensaje con el username ingresado o un ‘You’ y el número que devuelva mi contador.
- `CounterButtons`: Componente que tiene un contador. Son 2 botones que puedes sumar o restar al counter.

Siguiendo mi primera solución, aquí crearía 2 contextos. Uno para el username (`SessionContext`) y otro para el counter (`CounterContext`). Entonces la dependencia de contextos de mis componentes quedaría así:
- `SessionForm` depende de `SessionContext`
- `CounterButtons` depende de `CounterContext`
- `SessionCounterMessage` depende de `SessionContext` y `CounterContext`

Esta fue mi solución inicial:
```jsx
function App() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [counter, setCounter] = React.useState(1);

  return (
    <SessionContext.Provider
      value={React.useMemo(() => ({ currentUser, setCurrentUser }), [
        currentUser,
        setCurrentUser
      ])}
    >
      <CounterContext.Provider
        value={React.useMemo(() => ({ counter, setCounter }), [
          counter,
          setCounter
        ])}
      >
        <SessionForm />
        <SessionCounterMessage />
        <CounterButtons />
      </CounterContext.Provider>
    </SessionContext.Provider>
  );
}
```

Para que se den cuenta de mi error, agregué un console.log a mis componentes para que vean cuántas veces se renderizaba:
![](https://media.giphy.com/media/y2S7LixprI0B4ruvLF/giphy.gif)

Allí pueden ver que cuando actualizo el `counter`, se vuelve a renderizar el componente `SessionForm`, a pesar de que no depende del contexto `CounterContext` que es quien tiene a `counter` como estado. Y que cuando actualizo el `username` se vuelve a renderizar el componente `CounterButtons`, que no depende del contexto `SessionContext`, que tiene a `username` como estado.

Ahora que vieron mi código, ¿encontraron el error? 
Bueno, yo no encontraba fallas en mi lógica. Si los había separado en diferentes contextos. Entonces ¿por qué se seguían renderizando todos los componentes?

Lo que hice fue pedir ayuda. Le pregunté a @sergiodxa que tiene más tiempo usando React y me dijo:
Esto
```jsx
const MyContext = React.useContext({});

function App() {
  const [state, setState] = React.useState(false);

  return (
    <MyContext.Provider value={ { state, setState } }>
      <MyCustomComponent />
    </MyContext.Provider>
  );
}
```

Es diferente a esto:

```jsx
const MyContext = React.useContext({});

function MyContextProvider({ children }) {
  const [state, setState] = React.useState(false);

  return (
    <MyContext.Provider value={ { state, setState } }>
      {children}
    </MyContext.Provider>
  );
}

function App() {
  return (
    <MyContextProvider>
      <MyCustomComponent />
    </MyContextProvider>
  );
}
```

No me explicó el por qué en ese momento, quizá estaba ocupado, no lo recuerdo. Pero me di cuenta que estaba renderizando mi componente en el mismo lugar que estaba creando mis estados. Así que cada vez que actualizaba el estado, volvió a renderizar mi componente padre, que a su vez renderizaba a todos sus hijos. 

Con esto en mente, voy a cambiar el ejemplo que les dí al inicio, para comprobar que realmente funciona.
```jsx
function SessionProvider({ children }) {
  const [currentUser, setCurrentUser] = React.useState(null);

  return (
    <SessionContext.Provider
      value={React.useMemo(() => ({ currentUser, setCurrentUser }), [
        currentUser,
        setCurrentUser,
      ])}
    >
      {children}
    </SessionContext.Provider>
  );
}

function CounterProvider({ children }) {
  const [counter, setCounter] = React.useState(1);

  return (
    <CounterContext.Provider
      value={React.useMemo(() => ({ counter, setCounter }), [
        counter,
        setCounter,
      ])}
    >
      {children}
    </CounterContext.Provider>
  );
}

function App() {
  return (
    <SessionProvider>
      <CounterProvider>
        <SessionForm />
        <SessionCounterMessage />
        <CounterButtons />
      </CounterProvider>
    </SessionProvider>
  );
}
```

Aquí pueden ver los logs de las veces que se renderiza cada componente
![](https://media.giphy.com/media/MFlh4fH3nvolLnNESL/giphy.gif)
¡Funciona! ¡No más renders innecesarios!

Puede parecer una cambio muy pequeño, incluso se puede llegar a pensar que el usuario no se va a dar cuenta. Pero los componentes que estaba refactorizando renderizaban audios y videos. Cada vez que hacían un cambio respecto a los audios, los videos se volvían a renderizar y se sentía como un bug en la aplicación.

Si llegaron hasta aquí, gracias por leerme. ❤️
