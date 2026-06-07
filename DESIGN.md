# Design

## Theme

**Light theme (默认浅色主题)**

### Color strategy
```
Primary:   #007aff
Success:   #4cd964
Warning:   #f0ad4e
Danger:    #dd524d
```

## Color palette

```scss
$primary: #007aff;

$success: #4cd964;
$warning: #f0ad4e;
$danger:  #dd524d;
$info:    #909399;

$waterlogging:    #409EFF;
$pothole:       #F56C6C;
$manhole-missing: #E6A23C;
$manhole-damaged: #67C23A;

$bg:    #ffffff;
$bg-grey: #f8f8f8;
$ink:     #333333;
$ink-2:   #606266;
$ink-3:   #909399;
$border:  #ebeef5;
```

## Typography

```scss
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;

$text-xs:    22rpx;
$text-sm:    24rpx;
$text-base:  26rpx;
$text-lg:    28rpx;
$text-xl:    32rpx;
$text-2xl:   36rpx;
$text-3xl:   40rpx;

$font-normal: 400;
$font-medium: 500;
$font-semibold: 600;
```

## Spacing

```scss
$spacing-xs:   8rpx;
$spacing-sm:   16rpx;
$spacing:      24rpx;
$spacing-lg:  32rpx;
$spacing-xl:  48rpx;
```

## Components

### Button
- 圆角: 8rpx
- 高度: 64rpx
- 内边距: 0 32rpx

### Card
- 背景: #ffffff
- 边框: 1rpx solid #ebeef5
- 阴影: 0 4rpx 16rpx rgba(0,0,0,0.08)
- 圆角: 12rpx

### Status indicators
| 状态 | 颜色 |
|------|------|
| 已连接 | #4cd964 |
| 未连接 | #dd524d |
| 监测中 | #007aff |
| 已暂停 | #909399 |

## Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  顶部状态栏 (高度: 80rpx)                                             │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                      │
│  左侧边栏     │             右侧视频画面区                             │
│  (320rpx)    │                                                      │
│  实时统计      │                                                      │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

Grid layout:
```scss
.page {
  display: grid;
  grid-template-rows: 80rpx 1fr;
  grid-template-columns: 320rpx 1fr;
  height: 100vh;
}
```

## Motion

```scss
$transition-fast:   150ms ease-out;
$transition-normal: 200ms ease-out;
```

Motion only for state changes, no decorative animations.

## Anti-patterns to avoid

- 玻璃拟态 (Glassmorphism)
- 卡片嵌套
- 过度发光效果
- 紫蓝渐变主色调
- 不必要的装饰性动画
- 赛博朋克深色主题 + 霓虹风格
