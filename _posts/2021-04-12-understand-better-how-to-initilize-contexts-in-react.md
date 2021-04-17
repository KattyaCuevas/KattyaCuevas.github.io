---
layout: single
title: Improving the use of the contexts in React
published: true
description: TIL how to set well the contexts in React.
date: 2021-04-12T00:00:00.000Z
tags: react TIL
# header:
#   og_image: /assets/images/articles/como-me-afecto-la-experiencia-universitaria.png
---

Some months ago, I was refactoring a React project, and I was stuck in one problem for hours. The refactor was because of a common problem in React projects: Pass a lot of props to the child components, then you have to pass them to the child of them, and so. When this happens, if you want to reuse those components on another part of the app, you have to get information in your new component that maybe you don't need to worry about that time.

I separated the data into many contexts, so I only share the necessary data with the component that needs them. So I stopped to pass a lot of props in every component. Even that sounds like a successful refactor, it wasn't. My components keep updating when I updated an state of a context which they didn't depend on. It doesn't make sense, right?

To explain my problem, I'll give you an example.
I'll have 3 components:
- `SessionForm`: Component to add a username. If you have already entered it, it shows a greeting and a button to log out (delete the username). If you haven't entered it, it shows you an entry to add it.
- `SessionCounterMessage`: Component that shows a message with the username entered or a `You` and the number returned by a counter.
- `CounterButtons`: Component with a counter and 2 buttons that allow you to add or subtract from the counter.
And I'll have 2 contexts:
- `CounterContext` with the `counter` state.
- `SessionContext` with the `username` state.
 
This was my initial solution:
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

I added a console.log to my components to 
To make you aware of my error, I added a console.log to my components so that they see how many times it was rendered:
![](https://media.giphy.com/media/y2S7LixprI0B4ruvLF/giphy.gif)

There you can see, when I update the counter, it re-renders the `SessionForm` component. Even when it doesn't depend on the `CounterContext` context, which has `counter` state. 
And when I update the username, it re-renders the `CounterButtons` component. Even when it doesn't depend on the `SessionContext` context, which has `username` as a state.

Now you see my code, do you find my mistake?
Well, I didn't find any mistakes in my code if I had separated them into different contexts. Why did they keep re-render all the components?

What I did was ask for help. I asked @sergiodxa, who has been using React longer, and he said:
This
```jsx
const MyContext = React.useContext({});

function App() {
  const [state, setState] = React.useState(false);

  return (
    <MyContext.Provider value={{ state, setState }}>
      <MyCustomComponent />
    </MyContext.Provider>
  );
}
```
is different from this:
```jsx
const MyContext = React.useContext({});

function MyContextProvider({ children }) {
  const [state, setState] = React.useState(false);

  return (
    <MyContext.Provider value={{ state, setState }}>
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

He didn't explain why at that time; maybe he was busy, I don't remember. But I realized that I was rendering my component in the same place that I created my states. Every time I updated the state, it re-rendered my parent component, which re-render all its children.

With this in my mind, I'll change my initial example to check it works.
```jsx
function SessionProvider({ children }) {
  const [currentUser, setCurrentUser] = React.useState(null);

  return (
    <SessionContext.Provider
      value={React.useMemo(() => ({ currentUser, setCurrentUser }), [
        currentUser,
        setCurrentUser
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
        setCounter
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

Here you can see the logs when every component is rendered
![](https://media.giphy.com/media/MFlh4fH3nvolLnNESL/giphy.gif)

It works! No more unnecessary renders!

It could look like a small change, and even you could think the user won't notice this change. But the components I was refactoring rendered audios and videos. Every time I updated the audios, the videos would be re-rendered, and it looks like a bug in the app.


If you made it this far, thanks for reading. ❤️


