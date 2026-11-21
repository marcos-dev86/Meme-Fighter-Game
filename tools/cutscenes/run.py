#!/usr/bin/env python3
"""Uso: python3 tools/cutscenes/run.py 02 03 ...      (renderiza em assets/cutscenes/)
      python3 tools/cutscenes/run.py --preview 02 t1,t2,... DIR"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import engine
import scenes_a, scenes_b, scenes_mar, shorts
try:
    import finals
except ImportError:
    finals = None

REG = {}
for mod in (scenes_a, scenes_b, scenes_mar, shorts, finals):
    if mod:
        for k in dir(mod):
            if k.startswith('scene_'):
                REG[k[6:]] = getattr(mod, k)
OUT = os.path.join(engine.ROOT, 'assets', 'cutscenes')

def main():
    args = sys.argv[1:]
    if args and args[0] == '--preview':
        sc = REG[args[1]]()
        engine.render(sc, None, ([float(x) for x in args[2].split(',')], args[3]))
    else:
        for k in args or sorted(REG):
            sc = REG[k]()
            engine.render(sc, os.path.join(OUT, sc.name + '.mp4'))


if __name__ == '__main__':
    main()
