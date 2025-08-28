<template>
  <div class="avatar" :style="sizeStyle" :title="title">
    <img :src="src" alt="User avatar" />
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { getAvatarByGender, type Gender } from '@/utils/avatar';

type Props = {
  gender?: Gender;
  size?: number;
  title?: string;
  srcOverride?: string | null;
};

const props = defineProps<Props>();

const src = computed(
  () => props.srcOverride || getAvatarByGender(props.gender)
);
const sizeStyle = computed(() => ({
  width: `${props.size ?? 48}px`,
  height: `${props.size ?? 48}px`,
}));
</script>

<style scoped>
.avatar {
  display: inline-flex;
  border-radius: 9999px;
  overflow: hidden;
  background: #f2f3f5;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.06);
}
.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
