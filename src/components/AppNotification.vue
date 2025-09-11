<!-- src/components/AppNotification.vue -->
<template>
  <transition name="fade">
    <div v-if="visible" :class="['notification', type]">
      {{ $t(message) }}
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps({
  message: { type: String, required: true }, // Artık key olarak kullanılacak
  type: { type: String, default: 'info' }, // 'success', 'error', 'info'
  show: { type: Boolean, default: false },
  duration: { type: Number, default: 2500 },
});

const visible = ref(props.show);

watch(
  () => props.show,
  val => {
    visible.value = val;
    if (val) {
      setTimeout(() => {
        visible.value = false;
      }, props.duration);
    }
  }
);
</script>

<style scoped>
.notification {
  position: fixed;
  top: 48px;
  left: 60%;
  transform: translateX(-50%);
  min-width: 180px;
  max-width: 400px;
  padding: 10px 20px;
  border-radius: 6px;
  color: #fff;
  font-size: 0.95rem;
  z-index: 9999;
  text-align: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  background-color: #0eafc5;
}

.notification.success {
  background: #0ebc08;
  color: #fff;
}
.notification.error {
  background: #e53935;
}
.notification.info {
  background: #0eafc5;
}
.notification.warning {
  background: #ffcc00;
  color: #222;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
