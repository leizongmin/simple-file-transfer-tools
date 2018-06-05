# @leizm/sftt

简单文件传输工具

## 安装

```bash
npm i -g @leizm/sftt
```

## 启动服务器端

使用方法：

```bash
sftt-server --help

  Usage: sftt-server [options]

  Options:

    -V, --version      output the version number
    -i, --ip <ip>      允许的来源IP地址 (default: 127.0.0.1)
    -p, --port <port>  监听的端口 (default: 12345)
    -h, --host <host>  监听的地址 (default: 0.0.0.0)
    -d, --dir <dir>    文件根目录 (default: .)
    -h, --help         output usage information
```

示例：

```bash
sftt-server -i 192.168.1.2,127.0.0.1 -p 12345 -h 0.0.0.0 -d /data
```

## 客户端上传文件

使用方法：

```bash
sftt-client --help

  Usage: sftt-client [options]

  Options:

    -V, --version          output the version number
    -f, --file <file>      要上传的文件 (default: )
    -d, --dir <dir>        要上传的目录 (default: )
    -s, --server <server>  远程服务器地址（host:port/path） (default: 127.0.0.1:12345/data)
    -h, --help             output usage information
```

示例：

```bash
# 上传文件
sftt-client -s 127.0.0.1:12345/dir1 -f test.txt
# 上传整个目录下的所有文件
sftt-client -s 127.0.0.1:12345/dir2 -d data
```

## License

```text
MIT License

Copyright (c) 2018 Zongmin Lei <leizongmin@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
