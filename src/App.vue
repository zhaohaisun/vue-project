<script setup>
// App.vue 现在只负责渲染路由内容
</script>

<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
/* 基础样式保留在主CSS文件中 */
</style>
