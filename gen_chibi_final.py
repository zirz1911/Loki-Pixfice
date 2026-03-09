#!/usr/bin/env python3
"""
Norse Chibi Sprites — Exact reference style match.

KEY STYLE from reference:
  - HUGE fluffy round hair dome = 60% of sprite height
  - TINY face = just a thin strip of skin + 2 dot eyes
  - COMPACT body = small colored block with minimal detail
  - STUB legs = 2-3px tall, barely there
  - CLEAN dark outlines everywhere
  - 3-4 shade levels per color area

Format: 112×96 (7 cols × 4 rows, 16×24 frames)
"""
from PIL import Image, ImageDraw, ImageFont
import os, copy

OUT = "/home/claude/Loki-Pixfice/office/public/assets/characters"
FW, FH = 16, 24
SW, SH = FW * 7, FH * 4
T = None  # transparent
O = (12, 10, 18, 255)  # outline

def c(r,g,b): return (r,g,b,255)

# ═══════════════════════════════════════════════════════════════════════
# ODIN — golden-brown fluffy hair, gold crown, dark purple robe
# ═══════════════════════════════════════════════════════════════════════
def odin_front():
    # Hair 4 shades
    h1=c(205,170,60); h2=c(175,140,42); h3=c(138,108,30); h4=c(98,75,20)
    # Crown
    c1=c(255,220,55); c2=c(230,190,40); c3=c(190,155,30)
    # Skin
    s1=c(238,190,148); s2=c(215,165,125); s3=c(185,138,100)
    # Eyes (just dark dots)
    e=c(32,22,12)
    # Robe
    r1=c(72,45,105); r2=c(52,32,82); r3=c(38,22,62)
    # Gold trim/belt
    g1=c(240,200,55); g2=c(200,165,40)
    # Boots
    b1=c(45,28,62); b2=c(30,18,45)
    return [
      #0: crown tips poking above hair
      [T, T, T, T, T, c1,T, c1,T, c1,T, T, T, T, T, T],
      #1: crown band in hair top
      [T, T, T, T, O, c2,c1,c2,c1,c2,O, T, T, T, T, T],
      #2: hair dome top
      [T, T, T, O, h1,h1,c3,c2,c3,h1,h1,O, T, T, T, T],
      #3: hair dome expanding
      [T, T, O, h1,h1,h2,h1,h1,h1,h2,h1,h1,O, T, T, T],
      #4: hair dome WIDE
      [T, O, h1,h1,h2,h2,h2,h2,h2,h2,h2,h1,h1,O, T, T],
      #5: hair dome full width
      [T, O, h1,h2,h2,h3,h3,h3,h3,h3,h2,h2,h1,O, T, T],
      #6: hair dome mid
      [T, O, h2,h2,h3,h3,h3,h3,h3,h3,h3,h2,h2,O, T, T],
      #7: hair dome lower — starts framing face
      [T, O, h2,h3,h3,h4,h4,h4,h4,h4,h3,h3,h2,O, T, T],
      #8: hair sides + forehead skin strip
      [T, O, h3,h4,s1,s1,s1,s1,s1,s1,s1,h4,h3,O, T, T],
      #9: face — DOT EYES (left eye visible, right = eyepatch)
      [T, O, h3,h4,s2,e, s2,s2,c(55,38,28),c(48,32,25),s2,h4,h3,O, T, T],
      #10: lower face — tiny mouth hint
      [T, T, O, h4,s2,s2,s3,s3,s2,s2,s2,h4,O, T, T, T],
      #11: chin + neck → collar
      [T, T, T, O, O, s3,s3,s3,s3,s3,O, O, T, T, T, T],
      #12: robe collar with gold
      [T, T, T, O, g1,r1,r1,r1,r1,r1,g1,O, T, T, T, T],
      #13: robe chest — gold rune
      [T, T, O, r1,r1,r2,g1,g2,g1,r2,r1,r1,O, T, T, T],
      #14: robe body + arms (skin dots at sides)
      [T, O, s3,r1,r2,r2,r2,r2,r2,r2,r2,r1,s3,O, T, T],
      #15: robe lower + belt
      [T, T, O, O, r2,g1,g2,g2,g2,g1,r2,O, O, T, T, T],
      #16: robe skirt
      [T, T, T, O, r2,r3,r3,r3,r3,r3,r2,O, T, T, T, T],
      #17: robe bottom split
      [T, T, T, O, r3,r3,O, T, O, r3,r3,O, T, T, T, T],
      #18: tiny legs
      [T, T, T, T, O, r3,O, T, O, r3,O, T, T, T, T, T],
      #19: boots
      [T, T, T, O, b1,b1,O, T, O, b1,b1,O, T, T, T, T],
      #20: boot soles
      [T, T, T, O, O, O, O, T, O, O, O, O, T, T, T, T],
      #21: empty
      [T]*16,
      #22: empty
      [T]*16,
      #23: empty
      [T]*16,
    ]

# ═══════════════════════════════════════════════════════════════════════
# THOR — big blonde fluffy hair, silver helm, blue armor, red cape
# ═══════════════════════════════════════════════════════════════════════
def thor_front():
    h1=c(240,215,125); h2=c(210,185,92); h3=c(175,150,62); h4=c(135,112,42)
    m1=c(212,218,228); m2=c(178,185,198); m3=c(138,148,165)  # helm silver
    s1=c(245,208,170); s2=c(225,185,148); s3=c(198,158,122)
    e=c(28,35,82)  # blue-ish iris dots
    a1=c(62,112,198); a2=c(42,82,165); a3=c(28,58,128)
    tl=c(95,215,255)  # lightning
    cp=c(178,38,38); cpd=c(138,25,25)  # cape
    g1=c(195,162,52); g2=c(158,128,38)
    b1=c(28,42,108); b2=c(18,28,78)
    return [
      #0: helm wings sticking up
      [T, T, T, m1,T, T, T, T, T, T, T, m1,T, T, T, T],
      #1: helm top in hair
      [T, T, T, O, O, m1,m2,m1,m2,m1,O, O, T, T, T, T],
      #2: helm band + hair top
      [T, T, T, O, m2,m3,m2,m3,m2,m3,m2,O, T, T, T, T],
      #3: hair dome starts — blonde and fluffy
      [T, T, O, h1,h1,h2,h1,h1,h1,h2,h1,h1,O, T, T, T],
      #4: hair dome WIDE
      [T, O, h1,h1,h2,h2,h2,h2,h2,h2,h2,h1,h1,O, T, T],
      #5: hair dome full
      [T, O, h1,h2,h2,h3,h3,h3,h3,h3,h2,h2,h1,O, T, T],
      #6: hair dome mid
      [T, O, h2,h2,h3,h3,h3,h3,h3,h3,h3,h2,h2,O, T, T],
      #7: hair lower, framing face
      [T, O, h2,h3,h3,h4,h4,h4,h4,h4,h3,h3,h2,O, T, T],
      #8: hair sides + forehead
      [T, O, h3,h4,s1,s1,s1,s1,s1,s1,s1,h4,h3,O, T, T],
      #9: DOT EYES
      [T, O, h3,h4,s2,e, s2,s2,s2,e, s2,h4,h3,O, T, T],
      #10: lower face
      [T, T, O, h4,s2,s2,s3,s3,s2,s2,s2,h4,O, T, T, T],
      #11: chin/neck
      [T, T, T, O, O, s3,s3,s3,s3,s3,O, O, T, T, T, T],
      #12: armor collar + lightning
      [T, T, T, O, tl,a1,a1,tl,a1,a1,tl,O, T, T, T, T],
      #13: chest plate
      [T, T, O, a1,a1,a2,tl,a2,tl,a2,a1,a1,O, T, T, T],
      #14: body + arms + cape peek
      [T, O, s3,a1,a2,a2,a2,a2,a2,a2,a2,a1,s3,O, T, T],
      #15: belt
      [T, T, O, cp,a2,g1,g2,g2,g2,g1,a2,cp,O, T, T, T],
      #16: lower armor + cape
      [T, T, O, cpd,a2,a3,a3,a3,a3,a3,a2,cpd,O, T, T, T],
      #17: cape + leg split
      [T, T, O, cpd,O, a3,O, T, O, a3,O, cpd,O, T, T, T],
      #18: legs
      [T, T, T, O, O, a3,O, T, O, a3,O, O, T, T, T, T],
      #19: boots
      [T, T, T, O, b1,b1,O, T, O, b1,b1,O, T, T, T, T],
      #20: boot soles
      [T, T, T, O, O, O, O, T, O, O, O, O, T, T, T, T],
      [T]*16, [T]*16, [T]*16,
    ]

# ═══════════════════════════════════════════════════════════════════════
# LOKI — dark purple hair, green horns, purple-green robe
# ═══════════════════════════════════════════════════════════════════════
def loki_front():
    h1=c(58,32,85); h2=c(42,22,68); h3=c(30,15,52); h4=c(20,10,38)
    k1=c(85,215,108); k2=c(58,178,75); k3=c(42,135,55)  # horns green
    s1=c(232,182,140); s2=c(210,158,118); s3=c(182,132,95)
    e=c(62,22,98)  # purple iris
    r1=c(122,55,162); r2=c(92,38,132); r3=c(65,25,98)
    mg=c(198,108,238)  # magic glow
    g1=c(75,192,95); g2=c(52,152,68)  # green accent
    b1=c(48,25,72); b2=c(32,15,52)
    return [
      #0: horn tips
      [T, T, T, k1,T, T, T, T, T, T, T, k1,T, T, T, T],
      #1: horns
      [T, T, T, O, k2,T, T, T, T, T, k2,O, T, T, T, T],
      #2: horn base + dark hair top
      [T, T, T, O, k3,h1,h1,h1,h1,h1,k3,O, T, T, T, T],
      #3: dark fluffy hair
      [T, T, O, h1,h1,h2,h1,h1,h1,h2,h1,h1,O, T, T, T],
      #4: hair WIDE — dark and voluminous
      [T, O, h1,h1,h2,h2,h2,h2,h2,h2,h2,h1,h1,O, T, T],
      #5: hair dome
      [T, O, h1,h2,h2,h3,h3,h3,h3,h3,h2,h2,h1,O, T, T],
      #6: hair mid
      [T, O, h2,h2,h3,h3,h3,h3,h3,h3,h3,h2,h2,O, T, T],
      #7: hair lower
      [T, O, h2,h3,h3,h4,h4,h4,h4,h4,h3,h3,h2,O, T, T],
      #8: forehead
      [T, O, h3,h4,s1,s1,s1,s1,s1,s1,s1,h4,h3,O, T, T],
      #9: sly eyes
      [T, O, h3,h4,s2,e, s2,s2,s2,e, s2,h4,h3,O, T, T],
      #10: smirk
      [T, T, O, h4,s2,s2,s2,s3,s3,s2,s2,h4,O, T, T, T],
      #11: chin
      [T, T, T, O, O, s3,s3,s3,s3,s3,O, O, T, T, T, T],
      #12: collar — green trim
      [T, T, T, O, g1,r1,r1,r1,r1,r1,g1,O, T, T, T, T],
      #13: chest — magic rune
      [T, T, O, r1,r1,r2,mg,r2,mg,r2,r1,r1,O, T, T, T],
      #14: body + arms
      [T, O, s3,r1,r2,r2,r2,r2,r2,r2,r2,r1,s3,O, T, T],
      #15: belt (green)
      [T, T, O, O, r2,g1,g2,g2,g2,g1,r2,O, O, T, T, T],
      #16: robe lower
      [T, T, T, O, r2,r3,r3,r3,r3,r3,r2,O, T, T, T, T],
      #17: robe split — asymmetric (trickster)
      [T, T, T, O, r3,r3,O, T, O, r3,O, T, T, T, T, T],
      #18: legs — one longer (asymmetric)
      [T, T, T, T, O, r3,O, T, O, r3,O, T, T, T, T, T],
      #19: boots
      [T, T, T, O, b1,b1,O, T, O, b1,b1,O, T, T, T, T],
      #20: soles
      [T, T, T, O, O, O, O, T, O, O, O, O, T, T, T, T],
      [T]*16, [T]*16, [T]*16,
    ]

# ═══════════════════════════════════════════════════════════════════════
# HEIMDALL — light sandy hair, gold circlet, teal armor
# ═══════════════════════════════════════════════════════════════════════
def heimdall_front():
    h1=c(232,212,158); h2=c(202,182,125); h3=c(168,148,92); h4=c(128,112,65)
    gc=c(255,215,75); gcd=c(218,178,52)  # gold circlet
    rb=c(255,92,92); rbb=c(92,195,255)  # rainbow gems
    s1=c(245,208,170); s2=c(225,185,148); s3=c(198,158,122)
    e=c(22,68,58)  # teal iris
    a1=c(48,148,122); a2=c(32,112,92); a3=c(22,82,65)
    tg=c(78,228,192)  # teal glow
    g1=c(65,218,178); g2=c(48,178,148)
    b1=c(18,58,48); b2=c(12,38,32)
    return [
      #0: rainbow gems
      [T, T, T, T, T, rb,gc,rbb,gc,rb,T, T, T, T, T, T],
      #1: circlet
      [T, T, T, T, O, gc,gcd,gc,gcd,gc,O, T, T, T, T, T],
      #2: circlet base + hair
      [T, T, T, O, gcd,h1,h1,h1,h1,h1,gcd,O, T, T, T, T],
      #3: light fluffy hair
      [T, T, O, h1,h1,h2,h1,h1,h1,h2,h1,h1,O, T, T, T],
      #4: hair WIDE
      [T, O, h1,h1,h2,h2,h2,h2,h2,h2,h2,h1,h1,O, T, T],
      #5: hair dome
      [T, O, h1,h2,h2,h3,h3,h3,h3,h3,h2,h2,h1,O, T, T],
      #6: hair mid
      [T, O, h2,h2,h3,h3,h3,h3,h3,h3,h3,h2,h2,O, T, T],
      #7: hair lower
      [T, O, h2,h3,h3,h4,h4,h4,h4,h4,h3,h3,h2,O, T, T],
      #8: forehead
      [T, O, h3,h4,s1,s1,s1,s1,s1,s1,s1,h4,h3,O, T, T],
      #9: watchful eyes — double dots (sees all)
      [T, O, h3,h4,s2,e, e, s2,e, e, s2,h4,h3,O, T, T],
      #10: lower face
      [T, T, O, h4,s2,s2,s3,s3,s2,s2,s2,h4,O, T, T, T],
      #11: chin
      [T, T, T, O, O, s3,s3,s3,s3,s3,O, O, T, T, T, T],
      #12: teal collar
      [T, T, T, O, tg,a1,a1,a1,a1,a1,tg,O, T, T, T, T],
      #13: chest
      [T, T, O, a1,a1,a2,tg,a2,tg,a2,a1,a1,O, T, T, T],
      #14: body + arms
      [T, O, s3,a1,a2,a2,a2,a2,a2,a2,a2,a1,s3,O, T, T],
      #15: belt
      [T, T, O, O, a2,g1,g2,g2,g2,g1,a2,O, O, T, T, T],
      #16: lower armor
      [T, T, T, O, a2,a3,a3,a3,a3,a3,a2,O, T, T, T, T],
      #17: leg split
      [T, T, T, O, a3,a3,O, T, O, a3,a3,O, T, T, T, T],
      #18: legs
      [T, T, T, T, O, a3,O, T, O, a3,O, T, T, T, T, T],
      #19: boots
      [T, T, T, O, b1,b1,O, T, O, b1,b1,O, T, T, T, T],
      #20: soles
      [T, T, T, O, O, O, O, T, O, O, O, O, T, T, T, T],
      [T]*16, [T]*16, [T]*16,
    ]

# ═══════════════════════════════════════════════════════════════════════
# TYR — dark red hair, red helm, red armor, one-hand stump
# ═══════════════════════════════════════════════════════════════════════
def tyr_front():
    h1=c(168,55,45); h2=c(135,38,32); h3=c(102,28,24); h4=c(72,20,18)
    m1=c(210,75,65); m2=c(178,58,52); m3=c(142,42,38)  # helm
    s1=c(245,208,170); s2=c(225,185,148); s3=c(198,158,122)
    e=c(72,20,18)
    a1=c(172,45,40); a2=c(135,32,28); a3=c(95,22,20)
    g1=c(235,105,65); g2=c(198,82,48)
    st=c(210,152,118)  # stump bandage
    b1=c(75,18,15); b2=c(48,12,10)
    return [
      #0: helm peak
      [T, T, T, T, T, m1,m2,m1,m2,m1,T, T, T, T, T, T],
      #1: helm
      [T, T, T, T, O, m1,m2,m1,m2,m1,O, T, T, T, T, T],
      #2: helm base
      [T, T, T, O, m2,m3,m2,m3,m2,m3,m2,O, T, T, T, T],
      #3: red hair
      [T, T, O, h1,h1,h2,h1,h1,h1,h2,h1,h1,O, T, T, T],
      #4: hair WIDE
      [T, O, h1,h1,h2,h2,h2,h2,h2,h2,h2,h1,h1,O, T, T],
      #5: hair dome
      [T, O, h1,h2,h2,h3,h3,h3,h3,h3,h2,h2,h1,O, T, T],
      #6: hair mid
      [T, O, h2,h2,h3,h3,h3,h3,h3,h3,h3,h2,h2,O, T, T],
      #7: hair lower
      [T, O, h2,h3,h3,h4,h4,h4,h4,h4,h3,h3,h2,O, T, T],
      #8: forehead
      [T, O, h3,h4,s1,s1,s1,s1,s1,s1,s1,h4,h3,O, T, T],
      #9: determined eyes
      [T, O, h3,h4,s2,e, s2,s2,s2,e, s2,h4,h3,O, T, T],
      #10: lower face
      [T, T, O, h4,s2,s2,s3,s3,s2,s2,s2,h4,O, T, T, T],
      #11: chin
      [T, T, T, O, O, s3,s3,s3,s3,s3,O, O, T, T, T, T],
      #12: collar
      [T, T, T, O, g1,a1,a1,a1,a1,a1,g1,O, T, T, T, T],
      #13: chest
      [T, T, O, a1,a1,a2,g1,a2,g1,a2,a1,a1,O, T, T, T],
      #14: body — LEFT arm skin, RIGHT arm = STUMP
      [T, O, s3,a1,a2,a2,a2,a2,a2,a2,a2,a1,st,O, T, T],
      #15: belt
      [T, T, O, O, a2,g1,g2,g2,g2,g1,a2,O, O, T, T, T],
      #16: lower armor
      [T, T, T, O, a2,a3,a3,a3,a3,a3,a2,O, T, T, T, T],
      #17: leg split
      [T, T, T, O, a3,a3,O, T, O, a3,a3,O, T, T, T, T],
      #18: legs
      [T, T, T, T, O, a3,O, T, O, a3,O, T, T, T, T, T],
      #19: boots
      [T, T, T, O, b1,b1,O, T, O, b1,b1,O, T, T, T, T],
      #20: soles
      [T, T, T, O, O, O, O, T, O, O, O, O, T, T, T, T],
      [T]*16, [T]*16, [T]*16,
    ]

# ═══════════════════════════════════════════════════════════════════════
# YMIR — icy blue hair, frost crown, blue skin, WIDER (frost giant)
# ═══════════════════════════════════════════════════════════════════════
def ymir_front():
    h1=c(192,218,238); h2=c(158,188,212); h3=c(122,155,182); h4=c(88,118,148)
    ic=c(228,245,255); icd=c(195,220,242); icdd=c(158,188,218)  # ice crown
    s1=c(202,228,248); s2=c(172,200,225); s3=c(142,172,198)  # blue frost skin
    e=c(55,82,105)
    a1=c(92,148,192); a2=c(65,115,162); a3=c(45,85,128)
    ig=c(158,218,255)  # ice glow
    g1=c(152,218,252); g2=c(118,185,228)
    b1=c(38,58,82); b2=c(25,42,62)
    return [
      #0: ice spikes (WIDER crown)
      [T, T, ic,T, ic,T, ic,T, ic,T, ic,T, ic,T, T, T],
      #1: ice crown band (wider than others)
      [T, O, ic,icd,ic,icd,ic,icd,ic,icd,ic,icd,ic,O, T, T],
      #2: crown base + hair
      [T, O, icd,icdd,h1,h1,h1,h1,h1,h1,h1,icdd,icd,O, T, T],
      #3: icy fluffy hair (WIDE)
      [T, O, h1,h1,h2,h1,h1,h1,h1,h1,h2,h1,h1,O, T, T],
      #4: hair dome EXTRA WIDE (giant!)
      [O, h1,h1,h2,h2,h2,h2,h2,h2,h2,h2,h2,h1,h1,O, T],
      #5: hair dome
      [O, h1,h2,h2,h3,h3,h3,h3,h3,h3,h3,h2,h2,h1,O, T],
      #6: hair mid
      [O, h2,h2,h3,h3,h3,h3,h3,h3,h3,h3,h3,h2,h2,O, T],
      #7: hair lower
      [O, h2,h3,h3,h4,h4,h4,h4,h4,h4,h4,h3,h3,h2,O, T],
      #8: forehead (wider face)
      [O, h3,h4,s1,s1,s1,s1,s1,s1,s1,s1,s1,h4,h3,O, T],
      #9: icy dot eyes
      [O, h3,h4,s2,s2,e, s2,s2,s2,e, s2,s2,h4,h3,O, T],
      #10: lower face (wide)
      [T, O, h4,s2,s2,s2,s3,s3,s3,s2,s2,s2,h4,O, T, T],
      #11: wide chin
      [T, T, O, O, s3,s3,s3,s3,s3,s3,s3,O, O, T, T, T],
      #12: collar (ice glow, wider)
      [T, T, O, ig,a1,a1,ig,a1,ig,a1,a1,ig,O, T, T, T],
      #13: chest (wider)
      [T, O, a1,a1,a2,ig,a2,a2,a2,ig,a2,a1,a1,O, T, T],
      #14: body + arms (wider)
      [O, s3,a1,a2,a2,a2,a2,a2,a2,a2,a2,a2,a1,s3,O, T],
      #15: belt (wider)
      [T, O, O, a2,g1,g2,g2,g2,g2,g2,g1,a2,O, O, T, T],
      #16: lower (wider)
      [T, T, O, a2,a3,a3,a3,a3,a3,a3,a3,a2,O, T, T, T],
      #17: leg split (wider)
      [T, T, O, a3,a3,O, O, T, O, O, a3,a3,O, T, T, T],
      #18: big legs
      [T, T, T, O, a3,a3,O, T, O, a3,a3,O, T, T, T, T],
      #19: big boots
      [T, T, O, b1,b1,b1,O, T, O, b1,b1,b1,O, T, T, T],
      #20: soles
      [T, T, O, O, O, O, O, T, O, O, O, O, O, T, T, T],
      [T]*16, [T]*16, [T]*16,
    ]


# ═══════════════════════════════════════════════════════════════════════
# ANIMATION — walk bob, typing, back, side
# ═══════════════════════════════════════════════════════════════════════
def place(sheet, col, row, grid):
    ox, oy = col * FW, row * FH
    for y, line in enumerate(grid):
        for x, px in enumerate(line):
            if px is not None:
                sx, sy = ox + x, oy + y
                if 0 <= sx < SW and 0 <= sy < SH:
                    sheet.putpixel((sx, sy), px)

def make_walk(base, f):
    g = copy.deepcopy(base)
    # Bob on frames 1, 3
    if f in [1, 3]:
        for y in range(23, 0, -1):
            g[y] = copy.copy(g[y-1])
        g[0] = [T]*16
    # Leg alternation
    if f == 1:
        for y in range(17, 21):
            for x in range(1, 8):
                if g[y][x] is not None and g[y][x] != T:
                    if x > 0 and (g[y][x-1] is None or g[y][x-1] == T):
                        g[y][x-1] = g[y][x]; g[y][x] = T; break
    elif f == 3:
        for y in range(17, 21):
            for x in range(14, 7, -1):
                if g[y][x] is not None and g[y][x] != T:
                    if x < 15 and (g[y][x+1] is None or g[y][x+1] == T):
                        g[y][x+1] = g[y][x]; g[y][x] = T; break
    # Arm swing
    if f == 1:
        for x in range(3):
            if g[14][x] is not None and g[14][x] != T:
                g[13][x] = g[14][x]; g[14][x] = T; break
    elif f == 3:
        for x in range(15, 11, -1):
            if g[14][x] is not None and g[14][x] != T:
                g[13][x] = g[14][x]; g[14][x] = T; break
    return g

def make_typing(base, f):
    g = copy.deepcopy(base)
    if f == 1:
        for y in range(23, 0, -1):
            g[y] = copy.copy(g[y-1])
        g[0] = [T]*16
    # Arms forward (move side pixels inward)
    for y in [13, 14]:
        if y < len(g):
            r = g[y]
            if r[1] is not None and r[1] != T:
                g[y-1][2] = r[1]; r[1] = T
            if r[13] is not None and r[13] != T:
                g[y-1][12] = r[13]; r[13] = T
    return g

def make_back(base):
    g = copy.deepcopy(base)
    hpx = []
    for x in range(16):
        for y in [3, 4, 5]:
            if g[y][x] is not None and g[y][x] != T and g[y][x] != O:
                hpx.append(g[y][x]); break
    hc = hpx[len(hpx)//2] if hpx else O
    for y in [8, 9, 10]:
        for x in range(16):
            px = g[y][x]
            if px is not None and px != T and px != O and px not in hpx:
                g[y][x] = hc
    return g

def make_side(base, flip=False):
    g = [[T]*16 for _yy in range(24)]
    for y in range(24):
        src = base[y]
        filled = [(x, src[x]) for x in range(16) if src[x] is not None]
        if not filled: continue
        lft = filled[0][0]; rgt = filled[-1][0]
        w = rgt - lft + 1
        nw = max(1, int(w * 0.72))
        off = 5
        for _i, (ox2, px2) in enumerate(filled):
            nx = off + int((ox2 - lft) * nw / max(1, w))
            nx = max(0, min(15, nx))
            g[y][nx] = px2
    if flip:
        for y in range(24): g[y] = g[y][::-1]
    return g


# ═══════════════════════════════════════════════════════════════════════
# GENERATE SHEETS
# ═══════════════════════════════════════════════════════════════════════
AGENTS = [
    ("odin",     odin_front,     0),
    ("thor",     thor_front,     1),
    ("loki",     loki_front,     2),
    ("heimdall", heimdall_front, 3),
    ("tyr",      tyr_front,      4),
    ("ymir",     ymir_front,     5),
]

os.makedirs(OUT, exist_ok=True)
for name, fn, idx in AGENTS:
    sheet = Image.new("RGBA", (SW, SH), (0,0,0,0))
    base = fn()
    back = make_back(base)
    left = make_side(base, False)
    right = make_side(base, True)
    for row in range(4):
        src = [base, back, left, right][row]
        for col in range(7):
            if col <= 3:   g = make_walk(src, col)
            elif col <= 5: g = make_typing(src, col-4)
            else:          g = copy.deepcopy(src)
            place(sheet, col, row, g)
    sheet.save(os.path.join(OUT, f"char_{idx}.png"))
    print(f"✅ char_{idx}.png → {name}")

# ═══════════════════════════════════════════════════════════════════════
# FURNITURE
# ═══════════════════════════════════════════════════════════════════════
print("\n── Furniture ──")
FRW, FRH = 128, 64
furn = Image.new("RGBA", (FRW, FRH), (0,0,0,0))
WL=c(158,115,55); WM=c(130,95,40); WD=c(92,65,28); WO=c(58,38,18)
ML=c(175,180,195); MM=c(130,138,155); MD=c(88,95,112)
SB=c(18,28,42); SG=c(52,195,132)

def dfurn(img, ox, oy, busy=False):
    for x in range(32):
        for y in range(2): img.putpixel((ox+x,oy+y),WO)
    for x in range(32):
        for y in range(2,11): img.putpixel((ox+x,oy+y),WL if(y==2 or x==1)else WM if x<31 else WD)
    for x in range(32): img.putpixel((ox+x,oy+11),WO)
    for y in range(12,17): img.putpixel((ox+2,oy+y),WD);img.putpixel((ox+3,oy+y),WM);img.putpixel((ox+28,oy+y),WD);img.putpixel((ox+29,oy+y),WM)
    sc = SG if busy else SB
    for x in range(3,13):
        for y in range(1,8): img.putpixel((ox+x,oy+y),MD if(y==1 or x==3 or x==12)else sc)
    if busy:
        for i in range(4):
            for x in range(5,5+3+i): img.putpixel((ox+x,oy+2+i),SG)
    for x in range(16,28):
        for y in range(6,10): img.putpixel((ox+x,oy+y),MD if(y==6 or x==16 or x==27)else MM)
    for kx in range(18,26,2):
        for ky in range(7,9): img.putpixel((ox+kx,oy+ky),ML)

PL=c(75,188,58);PM=c(50,148,40);PD=c(35,108,28);PT=c(158,95,50);PO=c(122,70,35)
def dplant(img, ox, oy):
    for x in range(3,11):
        for y in range(10,17): img.putpixel((ox+x,oy+y),PO if(x==3 or y==16)else PT)
    for x in range(4,10): img.putpixel((ox+x,oy+10),c(82,58,30))
    for y in range(5,10): img.putpixel((ox+7,oy+y),c(70,122,45))
    for lx,ly in [(7,2),(5,4),(9,4),(4,6),(10,6),(6,1),(8,3),(3,7),(11,5)]:
        for dx in range(-1,2):
            for dy in range(-1,2):
                px2,py2=ox+lx+dx,oy+ly+dy
                if 0<=px2<FRW and 0<=py2<FRH:
                    img.putpixel((px2,py2),PL if dx==0 and dy==0 else PM if abs(dx)+abs(dy)==1 else PD)

BKC=[c(195,55,55),c(55,85,195),c(55,168,75),c(195,168,55),c(155,55,155),c(55,155,155)]
def dshelf(img, ox, oy):
    for x in range(32):
        for y in range(22):
            if x==0 or x==31 or y==0 or y==21: img.putpixel((ox+x,oy+y),WO)
            elif x==1 or y==1: img.putpixel((ox+x,oy+y),WL)
            elif x==30 or y==20: img.putpixel((ox+x,oy+y),WD)
            else: img.putpixel((ox+x,oy+y),WM)
    for x in range(1,31): img.putpixel((ox+x,oy+11),WD)
    bx=2
    for bc in BKC[:4]:
        bw=5+(bx%2)
        for x in range(bw):
            for y in range(2,10): img.putpixel((ox+bx+x,oy+y),bc)
        bx+=bw+1
    bx=2
    for bc in BKC[2:]:
        bw=6+(bx%2)
        for x in range(bw):
            for y in range(13,20): img.putpixel((ox+bx+x,oy+y),bc)
        bx+=bw+1

def dlamp(img, ox, oy):
    for x in range(1,9):
        for y in range(5): img.putpixel((ox+x,oy+y),c(235,212,115) if y<2 else c(205,178,92) if y<4 else c(172,148,68))
    for y in range(5,24): img.putpixel((ox+4,oy+y),MD);img.putpixel((ox+5,oy+y),MM)
    for x in range(2,8):
        for y in range(24,27): img.putpixel((ox+x,oy+y),MD if y==24 else MM)

dfurn(furn,4,4);  dplant(furn,48,4);  dshelf(furn,72,4);  dlamp(furn,112,0)
dfurn(furn,4,34,busy=True)
furn.save(os.path.join(OUT,"furniture.png"))
print("✅ furniture.png")


# ═══════════════════════════════════════════════════════════════════════
# PREVIEW
# ═══════════════════════════════════════════════════════════════════════
SC = 8
NAMES=["Odin","Thor","Loki","Heimdall","Tyr","Ymir"]
ACOL=[(245,197,24),(79,195,247),(195,98,228),(64,208,176),(255,96,96),(144,208,248)]
ROLES=["Orchestrator","Code Brain","Quick Explorer","Researcher","Strategic Coder","Master Builder"]
PAD=22
PW=6*(FW*SC+PAD)+PAD*2
PH=FH*SC+85+FH*4+55
prev=Image.new("RGBA",(PW,PH),(10,10,22,255))
dr=ImageDraw.Draw(prev)
try:
    f1=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",16)
    f2=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",11)
except: f1=f2=ImageFont.load_default()

dr.text((PAD,10),"Loki-Pixfice — Norse Chibi RPG (Reference Style)",fill=(245,197,24),font=f1)

for i in range(6):
    sh=Image.open(os.path.join(OUT,f"char_{i}.png"))
    idle=sh.crop((6*FW,0,7*FW,FH)).resize((FW*SC,FH*SC),Image.NEAREST)
    x=PAD+i*(FW*SC+PAD); y=42
    prev.paste(idle,(x,y),idle)
    dr.text((x,y+FH*SC+5),NAMES[i],fill=(*ACOL[i],255),font=f1)
    dr.text((x,y+FH*SC+24),ROLES[i],fill=(100,110,140,255),font=f2)

wy=42+FH*SC+52
dr.text((PAD,wy),"Walk Cycle (4 frames):",fill=(120,120,160,255),font=f2)
wy+=16
for i in range(6):
    sh=Image.open(os.path.join(OUT,f"char_{i}.png"))
    for f in range(4):
        fr=sh.crop((f*FW,0,(f+1)*FW,FH)).resize((FW*4,FH*4),Image.NEAREST)
        x=PAD+i*(FW*SC+PAD)+f*(FW*4+3)
        if x+FW*4<PW: prev.paste(fr,(x,wy),fr)

prev.save("/home/claude/chibi_final_preview.png")
print(f"\n✅ Preview → /home/claude/chibi_final_preview.png")
print("✅ All done!")
