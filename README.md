# Obsidian插件：hugo小助手

## 这个插件的作用是？
- 自动分类:根据文档层级关系,给文档添加分类信息
- 标题与目录同步:当我们需要修改文档标题时，既要修改目录，又要修改文件内部的title字段，相当麻烦，因此定制了一些插件用于同步标题以及其他有用的信息。
- 修改文档后，一键修改lastmod
- 移动文档位置后，一键修改categories
- 修改分类名称时，帖子相应字段改变。


# 功能1：文档的创建
在content/posts的子目录下，右键新建打开菜单，选择`hugo新建帖子`，会弹框让你输入标题，输入完成后确认，会自动根据固定模板创建一篇空白文档。
//TODO 自定义模板

# 功能2：分类文件夹的创建与修改
## 注意：
1. 仅content/posts目录下新建的文件夹被视作分类文件夹
- 例如 /content/posts/Linux， 则Linux被视作一种分类.
- 例如 /content/posts/Linux/Ubuntu， 则Linux,Ubuntu分别被视作一种分类
2. 当分类文件夹的直接子目录（就是第一层子目录）包含.md文件，则不被视为分类文件夹，而是文档的标题。
- 例如 /content/posts/Linux/Ubuntu/Ubuntu开启Samba/index.zh-cn.md (注意obsidian不会显示md拓展名称), 则Linux, Ubuntu是分类文件夹，而Ubuntu开启Samba由于子目录含有md文件，则不被视作分类文件夹。
3. 分类文件夹的名称会被自动写入到md文件的index.zh-cn.md文档的`categories`属性当中，作为文档的分类。

## 分类文件夹的创建: 右键content/posts的子目录下，右键`hugo:添加分类`
## 分类文件夹的修改: 右键content/posts下选中分类目录，右键`hugo:修改分类名称`，即可修改。
注意，该操作会自动遍历所有md文档，你没听错，是遍历所有md文件，并对md文件的目录进行判断，当文件的目录属于当前正在修改文件夹的文档时（右键会传递修改文件夹的路径信息），
更新该md文件内部的`categories`为修改后的名称。
## 分类文件夹的删除:右键直接删除即可。

简而言之，md文档的父目录都是该文档的分类，当分类名称修改时，会被自动写入md文件的`categories`的属性当中。

## 更新分类、标题和上次修改时间
文档目录结构为


    |仓库
    |content
      |posts                     <--文档路径 content/posts
        |Linux                   <--分类
          |编程杂谈               <--分类
            |Ubuntu安装Samba      <--文档标题
              |index.zh-cn.md     <--中文文档
              |index.en.md        <--英文文档


当选中 index.zh-cn.md时候，执行 "更新更新属性"时候，则自动生成如下内容
```yaml
---
lastmod: 2023-11-05T21:52:00.743Z
categories:
  - 编程杂谈
  - Linux
  - Ubuntu
title: Ubuntu安装Samba
---
```
其中
- `lastmod`: 基于文档的最后修改时间，格式化为ISO 8061标准时间
- `categories` 的值基于文档所在路径，对路径进行切割，排除掉根目录和文档所在的目录后，得到的数组, 请不要直接修改该值，而是通过`修改分类名称`的方式。
- `title` 则是文档名称，基于父目录的名称。因为文档本身的名称需要用来标识何种语言的文档，因此md文件不能用文档标题作为名称。

> 注意：文档变更目录时，应当移动.md的父目录（也就是标题目录)，移动到新的分类文件夹后，只需要打开md文件，右键点击`hugo:更新属性`，就会自动获取修改categories为新的值(同时会修改lastmod)

# 功能3：文档也有连续剧--系列
写博客的时候，除了分类、标签以外，觉得分类还是不太够，比如一些连贯的文章仅仅是靠标签和分类是不够的，因此加入了“系列”的功能。
我不清楚他内部是怎么实现的，但是我们要用它的方法，只需要做到以下几点。
### 1. 创建系列：结构为 `series/[系列名称]/index_xx.md`




      |仓库
      |content
      | |posts                     <--文档路径
      |   |Linux                   <--分类
      |     |编程杂谈               <--分类
      |       |Ubuntu安装Samba      <--文档标题
      |         |index.zh-cn.md     <--中文文档
      |         |index.en.md        <--英文文档
      |...
        |series                     <--系列路径
          |Linux从入门到放弃         <--系列名称  
            |index.zh-cn.md     <--中文文档
            |index.en.md        <--英文文档
          |MySQL删库指南         <--系列名称  
            |index.zh-cn.md     <--中文文档
            |index.en.md        <--英文文档



注意到上面的目录结构中，我们创建了两个系列，分别是`Linux从入门到放弃`和`MySQL删库指南`,他们都必须位于series目录之下！而且只能一级目录，不能放多级目录。
其中，index.zh-cn.md和index.en.md则存放title信息，这样在不同语言环境下就能显示出对应的语言。


    |Linux从入门到放弃         <--系列名称  
      |index.zh-cn.md     <--中文文档
      |index.en.md        <--英文文档

其中index.zh-cn.md内容如下
```yaml
---
title: Linux从入门到放弃
---
```

其中index.en.md内容如下
```yaml
---
title: I love Linux
---
```

当我们需要将某篇文章加入到系列，不需要在系列目录下创建新的文档，只需要在我们posts/下面写好的文档中，属性加入 `series: [系列名称]` 即可。

```yaml
---
lastmod: 2023-11-05T21:52:00.743Z
categories:
  - 编程杂谈
  - Linux
  - Ubuntu
title: Ubuntu安装Samba
series:
  - Linux从入门到放弃
---
```

## 修改系列。
这时候同样的问题来了，每次我们创建系列的时候，还要手动复制粘贴，太麻烦，不如弄个按钮点击后，自动遍历 series/下的所有名称，然后呈现一个带搜索框的列表，点击后就直接插入到我们的文档中，岂不美哉？
### 如何修改：打开md文档，对着打开的文档窗口，右键选择`hogo:修改系列`，会自动遍历你在series下创建的系列，选择后，文档的series会自动修改。


# 功能5：发布帖子
//TODO 实现发布帖子。
- 暂时先用其他插件执行git命令发布帖子，这里推荐shell command, 安装完成后，填写一下几条命令基本上没问题了
```shell
git add {{folder_path:relative}}
git commit -m "{{folder_name}}"
git push origin main
```


# 安装插件
1. 新建一个用于存放我们插件的文件夹，名字就叫 obshugo 

```shell
mkdir -p .obsidian/plugins/obshugo/
``````

2. 复制 `main.js`和`style.css`以及`manifest.json`四个文件到刚刚创建的目录下


        |仓库
        |.obsidian
          |plugins
            |obshugo
              |main.js
              |manifest.json
              |style.css



3. 打开obsidian，在第三方插件中开启 `obshugo`


# 如何Debug？

下载本仓库到obsidian插件目录，进入插件目录执行 `nmp -i` 安装依赖，接着执行`npm run dev`,打开obsidian开启插件，就可以进入调试了。

> 提示，Windows用户按下`Ctrl + Shift + I`可以打开obsidian的控制台

更多信息可以查看[这篇文章](https://blog.codee.top/obsidian%E6%8F%92%E4%BB%B6%E5%BC%80%E5%8F%91%E4%B8%80%E5%85%A5%E9%97%A8/)


# 常见问题
1. obsidian图片链接无法识别
   - 进入设置->文件与链接
   - 关掉Wiki链接
   - 内部链接类型设置为“基于当前笔记相对路径”
2. hugo中md文档链接指向失效
找到hugo配置文件 layouts/_default_markup/render-link.html，没有则自己创建文件夹和html文件，并输入以下内容到render-link.html，它会改变hugo对链接的渲染方式。
说实话这部分我也不太懂。大概意思就是检测到url是.md结尾，就引用了某个资源。忘记在哪里抄代码了。如果有人有更好的解决办法欢迎pr和issue。
```html
{{- $url := urls.Parse .Destination -}}
{{- $scheme := $url.Scheme -}}

{{ $dest := (printf "%s" .Destination) }}
<a href="
{{- if eq $scheme "" -}}
	{{- if strings.HasSuffix $url.Path ".md" -}}

		 {{- ref .Page $dest | safeURL -}}
	{{- else -}}
		{{- .Destination | safeURL -}}
	{{- end -}}
{{- else -}}
	{{-  .Destination | safeURL -}}
{{- end -}}"
{{- with .Title }} title="{{ . | safeHTML }}"{{- end -}}>
{{-  .Text | safeHTML -}}

</a>

{{- /* whitespace stripped here to avoid trailing newline in rendered result caused by file EOL */ -}}

```
