# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont
import os
HERE=os.path.dirname(os.path.abspath(__file__)); PROJ=os.path.dirname(HERE)
def font(sz):
    for p in [r'C:\Windows\Fonts\msjhbd.ttc',r'C:\Windows\Fonts\msjh.ttc',r'C:\Windows\Fonts\segoeui.ttf']:
        if os.path.exists(p):
            try:return ImageFont.truetype(p,sz)
            except:pass
    return ImageFont.load_default()
def make(sz,pad,fn):
    img=Image.new('RGBA',(sz,sz),(0,0,0,0)); d=ImageDraw.Draw(img)
    # 漸層底
    for y in range(sz):
        t=y/sz; r=int(67+(109-67)*t); g=int(56+(90-56)*t); b=int(202+(224-202)*t)
        d.line([(0,y),(sz,y)],fill=(r,g,b,255))
    # 圓角遮罩
    m=Image.new('L',(sz,sz),0); md=ImageDraw.Draw(m)
    rad=int(sz*0.22); md.rounded_rectangle([0,0,sz,sz],rad,fill=255)
    img.putalpha(m)
    d=ImageDraw.Draw(img)
    txt='英'; f=font(int(sz*0.5))
    bb=d.textbbox((0,0),txt,font=f); w=bb[2]-bb[0]; h=bb[3]-bb[1]
    d.text(((sz-w)/2-bb[0],(sz-h)/2-bb[1]-int(sz*0.02)),txt,font=f,fill=(255,255,255,255))
    # 小鎖
    lf=font(int(sz*0.16)); d.text((sz*0.72,sz*0.66),'🔒',font=lf,fill=(255,255,255,230))
    img.save(os.path.join(PROJ,fn))
    print('wrote',fn)
make(192,0,'icon-192.png')
make(512,0,'icon-512.png')
make(180,0,'apple-touch-icon.png')
