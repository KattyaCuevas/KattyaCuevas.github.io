---
layout: single
title: Mi primera app con React Native
published: true
description: Introducción a ReactNative con Expo
date: 2020-06-21T00:00:00.000Z
tags: react react-native expo
header:
  og_image: /assets/images/articles/mi-primera-app-con-react-native.png
---

[React Native](https://reactnative.dev/) es un framework para desarrollar aplicaciones nativas iOS y Android con React. Hay dos formas de empezar una aplicación con React Native, la primera es usando el CLI (línea de comandos) de react-native y la segunda es usando el CLI de Expo.

[Expo](https://expo.io/) es una buena opción ya que tiene varios componentes adicionales construidos a partir de ReactNative para tener control de más APIs nativas y además te permite hacer build y deploy de tus aplicaciones para iOS, Android y web a la vez.

Para este tutorial, haré una aplicación de posts usando expo. Si quieres seguir usando la primera opción, te recomiendo hacer el setup inicial siguiendo la [documentación oficial](https://reactnative.dev/docs/environment-setup) de ReactNative.

**Requerimientos:**
- node
- yarn
- expo-cli
  ```sh
  $ npm install -g expo-cli
  ```
  > Para este post tengo la versión 3.21.9
- **(Opcional)** Emuladores Android y iOS, es opcional ya que con expo puedes probar desde tu celular, debes instalarte expo en tu celular.

Para crear una aplicación, para este caso llamado `MyPostApp`, solo debes correr:

```sh
$ expo init MyPostApp
```

Escoge `empty template`, para empezar con una página en blanco.

Para ingresar al proyecto:
```sh
$ cd MyPostApp
```

Para iniciar el proyecto:
```sh
$ yarn start
```

> Expo te dará un código QR con el que podrás abrir la aplicación desde tu celular.

Para empezar a editar tu aplicación, solo debes ir al archivo `App.js`.

```jsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

Llamamos a 3 componentes de ReactNative:
- **View:** Es un componente que representa un contenedor básico en la UI, este puede agrupar texto, imágenes, vídeos. Comparándolo con desarrollo web, es lo más parecido a una etiqueta div.
- **Text:** Este componente se usa solo para mostrar texto o anidar etiquetas de texto. Solo con esta etiqueta se puede mostrar texto.
- **StyleSheet:** Es una forma de escribir código CSS lo más parecido a CSS StyleSheets.

## Listar Posts

Guardemos nuestros posts en un array por el momento, ya que no tendremos una interacción con una base de datos.

```jsx
const POSTS = [
  {
    id: 1,
    body:
      "In irure minim in pariatur nisi irure reprehenderit cupidatat. Consequat ea enim veniam Lorem id nulla proident aute.",
    createdAt: new Date(2020, 3, 15),
    author: "elizabeth",
  },
  {
    id: 2,
    body:
      "Nisi laborum ea ad sit exercitation eu incididunt elit nostrud excepteur irure enim. Magna do aliqua officia officia dolore ad proident. Occaecat cillum sit veniam ea nostrud deserunt duis cupidatat laboris enim nostrud deserunt ex non.",
    createdAt: new Date(2020, 5, 2),
    author: "elizabeth",
  },
  {
    id: 3,
    body:
      "Nulla Lorem Lorem occaecat laboris minim anim sit ea eiusmod. Sunt ea ex exercitation est veniam.",
    createdAt: new Date(2020, 5, 25),
    author: "emma",
  },
];

```

Para renderizar listas con ReactNative, se usa FlatList estos props son las más básicos:
- data: aquí se pasa nuestra estructura de datos
- renderItem: se pasa el componente a renderizar, este va a recibir `item` como prop, conteniendo cada uno de los ementos de la lista
- keyExtractor: Como es una lista, cada elemento debe tener un key

```jsx
export default function App() {
  return (
    <View style={styles.container}>
      <FlatList
        data={POSTS}
        renderItem={({ item }) => <Text>{item.body}</Text>}
        keyExtractor={(post) => Number(post.id)}
      />
    </View>
  );
}
```

> Si estas en iOS, verás que tu aplicación se renderiza sin importarle el StatusBar, para evitar que tome este espacio se usa [SafeAreaView](https://reactnative.dev/docs/safeareaview).

Agreguemos un poco de estilos a nuestra lista de posts:
Primero crearemos un componente para el card de cada post:

```jsx
// components/PostCard.js

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function PostCard({ post }) {
  return (
    <View style={styles.postContainer}>
      <Text style={styles.postBody}>{post.body}</Text>
      <Text style={styles.postAuthor}>{post.author}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  postContainer: {
    backgroundColor: "#dfefff",
    marginHorizontal: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: "#d1dcdf",
    borderRadius: 5,
    padding: 10,
  },
  postBody: {
    fontSize: 16,
    color: "#292944",
  },
  postAuthor: {
    alignSelf: "flex-end",
    color: "#6e6e7e",
    fontSize: 14,
  }
});
```

Actualizamos la página principal agregando un título y algunos estilos:

```jsx
export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Posts List</Text>
      <FlatList
        data={POSTS}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={post => post.body}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#b4cefe",
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    color: "#292944",
    fontSize: 24,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 10,
  }
});
```
## Agregar un post

Para crear un post, se abrirá un modal con un formulario. Para esto, usaremos tres componentes nuevos:
- **TouchableOpacity:** Es un componente que al presionarlo cambiará la opacidad. Este componente puede encerrar muchos componentes dentro. Tendrá un prop `onPress` que recibe una función que se ejecutará cuando se presione el componente.
- **Modal:** Componente que representa un modal. Este recibe el prop `visible` que se encargará de mostrar o no la vista que se encuentre dentro de este componente.
- **TextInput:** Componente que representa un input de tipo texto, adicional puedes pedir que al presionarlo abra un teclado en especial.

Primero crearemos nuestro componente con el contenido del modal, el formulario para agregar un nuevo post. Este componente recibirá tres props, `visible` que indicará si el modal se ve o no, `setVisible` será una función que recibe el nuevo valor de visible, y `setPosts` para editar la lista de posts inicial.

Para los valores del formulario, tendremos 2 estados, body y author. Para la UI, usaremos dos `TextInput` y un `TouchableOpacity`. En el prop `onChangeText` de los `TextInput` cambiaremos los valores de cada estado. Para el body, le agregaremos el prop `multiline` con valor `true`, así daremos la impresión de que el body contiene más que una linea de textos. El `TouchableOpacity` lo usaremos para agregar un nuevo post a nuestra lista de posts y limpiar el valor de cada estado usado en el formulario.

```jsx
// components/NewPostModal.js

import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  Text,
  TextInput,
  StyleSheet,
} from "react-native";

export default function NewPostModal({ visible, setVisible, setPosts }) {
  const [body, setBody] = React.useState("");
  const [author, setAuthor] = React.useState("");
  const createPost = () => {
    setPosts((posts) => [
      ...posts,
      { id: Date.now(), body, author, createdAt: Date.now() },
    ]);
    setBody("");
    setAuthor("");
    setVisible(false);
  };

  return (
    <Modal visible={visible} transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <View style={styles.closeButton}>
              <Text>X</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>Nuevo post</Text>
          <View style={styles.inputGroup}>
            <TextInput
              placeholder="Body"
              style={[styles.textInput, { height: 35 }]}
              value={body}
              onChangeText={(text) => setBody(text)}
              multiline={true}
            />
          </View>
          <View style={styles.inputGroup}>
            <TextInput
              placeholder="Author"
              style={styles.textInput}
              value={author}
              onChangeText={(text) => setAuthor(text)}
            />
          </View>
          <TouchableOpacity
            onPress={() => createPost()}
            style={styles.createButton}
          >
            <Text>AGREGAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: "rgba(0,0,0,0.8)",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },
  modalContent: {
    backgroundColor: "#fff",
    width: "100%",
    paddingHorizontal: 15,
    paddingVertical: 20,
  },
  closeButton: { alignSelf: "flex-end" },
  title: {
    fontSize: 20,
    textAlign: "center",
    marginBottom: 12,
  },
  inputGroup: { flexDirection: "row", marginVertical: 10 },
  textInput: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: "#b7b7b7",
    height: 24,
    paddingVertical: 4,
    paddingHorizontal: 5,
  },
  createButton: {
    alignSelf: "flex-end",
    borderWidth: 1,
    borderColor: "gray",
    paddingHorizontal: 20,
    paddingVertical: 5,
    marginTop: 15,
  },
});

```

Ahora agregaremos un botón en la página principal (App.js) que abrirá el nuevo modal que hemos creado. Para esto usaremos un `TouchableOpacity`.

```jsx
// App.js

export default function App() {
  const [modalVisible, setModalVisible] = React.useState(false);
  const [posts, setPosts] = React.useState(POSTS);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Posts List</Text>
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostCard post={item} />}
        keyExtractor={(post) => post.body}
      />
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.button}>
        <Text>Agregar post</Text>
      </TouchableOpacity>
      <NewPostModal visible={modalVisible} setVisible={setModalVisible} setPosts={setPosts} />
    </SafeAreaView>
  );
}
```

Con esto tenemos una app básica con ReactNative, con el que mostramos una lista de posts y podemos agregar un nuevo post en nuestra lista.

![](https://media3.giphy.com/media/SWXJVtISHVfzlbsaWM/giphy.gif)