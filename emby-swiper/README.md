## 主页轮播图

参考项目地址：https://github.com/Nolovenodie/emby-crx 使用swiper插件：https://swiperjs.com

想隐藏主屏模块1的(只对4.8以下生效)，自行添加自动义css：
```
@media (min-width: 50em) {
  .section0 {
    display: none;
  }
}
```
2024-11-19 添加背景播放youtube的预告片（前提有刮削到）:emby-swiper-trailer.js;
注意：如果之前使用过emby-swiper;换成emby-swiper-trailer.js第二天生效；
或者在设置-主页-改变一下轮播设置，使得原缓存失效（缓存保存一天；0点起）
### 预览图
![d972613a8037308f90e7968933444b9](https://github.com/jackloves111/emby-front-end-mod/assets/89971817/48a4b66c-a412-4f67-8dab-d4e96354d5c8)
