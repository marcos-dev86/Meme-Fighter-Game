"""Recorte de fundo para artes enviadas com fundo quadriculado "falso" (xadrez cinza/branco assado na imagem) ou transparente.
Uso como modulo: from cutout import cutout. Nao inventa pixels: so remove o fundo ligado as bordas e suaviza a franja."""
import numpy as np
from collections import deque
from PIL import Image


def _bg_mask(rgb, tol_sat=28, min_v=196):
    """Pixels que PODEM ser fundo claro/cinza (baixa saturacao e claros)."""
    mx = rgb.max(axis=2).astype(int)
    mn = rgb.min(axis=2).astype(int)
    # xadrez: quadrados cinza (~168) e brancos (~246), sem cor
    return ((mx - mn) <= tol_sat) & (mn >= 140)


def cutout(im, alpha_min=250):
    im = im.convert('RGBA')
    a = np.array(im)
    h, w = a.shape[:2]
    if (a[..., 3] < alpha_min).mean() > 0.05:  # ja tem transparencia de verdade
        alpha = a[..., 3].copy()
        alpha[alpha < 24] = 0
        a[..., 3] = alpha
        return Image.fromarray(a)
    cand = _bg_mask(a[..., :3])
    seen = np.zeros((h, w), bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if cand[y, x] and not seen[y, x]:
                seen[y, x] = True; dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if cand[y, x] and not seen[y, x]:
                seen[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and cand[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; dq.append((ny, nx))
    # fecha o fundo 2 px para dentro em pixels de baixa saturacao (franja anti-aliasing do xadrez)
    from scipy import ndimage as ndi
    soft = _bg_mask(a[..., :3], tol_sat=40) | (a[..., :3].max(axis=2) >= 225)
    grow = ndi.binary_dilation(seen, iterations=2) & soft
    seen = seen | grow
    # ilhas de personagem minusculas (ruido) viram fundo
    lab, n = ndi.label(~seen)
    if n:
        sizes = ndi.sum(~seen, lab, range(1, n + 1))
        keep = np.zeros(n + 1, bool)
        keep[1:] = sizes >= max(200, 0.0008 * h * w)
        seen = ~keep[lab]
    alpha = np.where(seen, 0, 255).astype(np.uint8)
    # tira ilhas pequenas de "fundo" que sobraram (riscos do xadrez) e franjas de 1 px claras junto da borda do recorte
    a[..., 3] = alpha
    out = Image.fromarray(a)
    return out


def trim(im, pad=0):
    bbox = im.getbbox() if im.mode == 'L' else im.split()[3].getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))
