<script>
// 这个组件确保内容只在客户端渲染，避免SSR问题
export default {
  name: 'ClientOnly',
  data() {
    return {
      mounted: false
    }
  },
  mounted() {
    this.mounted = true
  },
  render() {
    if (this.mounted) {
      return this.$slots.default ? this.$slots.default() : null
    }
    return null
  }
}
</script> 