import { createApp, h } from 'vue'

const app = createApp({
  setup () {
    return () => <h1 class="">Hello world!</h1>
  }
})

app.mount('#app')
