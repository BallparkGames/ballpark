import numpy as np, wave
SR=44100; T=13.6; N=int(SR*T); out=np.zeros(N)
def add(sig,t,g=1.0):
    i=int(t*SR); j=min(N,i+len(sig)); out[i:j]+=sig[:j-i]*g
def env(n,a=0.005,d=0.3):
    t=np.arange(n)/SR; return np.minimum(1,t/a)*np.exp(-t/d)
def tone(f,dur,d=0.3,a=0.005,harm=(1,.5,.25)):
    n=int(dur*SR); t=np.arange(n)/SR
    s=sum(h*np.sin(2*np.pi*f*(k+1)*t) for k,h in enumerate(harm)); return s*env(n,a,d)
def pluck(f,dur=0.6):
    n=int(dur*SR); p=int(SR/f); buf=np.random.uniform(-1,1,p); o=np.zeros(n)
    for i in range(n):
        o[i]=buf[i%p]; buf[i%p]=0.5*(buf[i%p]+buf[(i+1)%p])*0.996
    return o*env(n,0.002,0.5)
def note(m): return 440*2**((m-69)/12)
# music bed: 112 bpm arpeggio over C - Am - F - G
bpm=112; step=60/bpm/2
chords=[[60,64,67,72],[57,60,64,69],[53,57,60,65],[55,59,62,67]]
t=0; k=0
while t<T-0.3:
    ch=chords[(k//8)%4]; m=ch[[0,1,2,3,2,1,2,3][k%8]]
    add(pluck(note(m)),t,0.22)
    if k%8==0: add(tone(note(ch[0]-24),1.9,d=0.9,a=0.02,harm=(1,.3)),t,0.18)
    if k%2==0: # soft kick
        n=int(.15*SR); tt=np.arange(n)/SR; add(np.sin(2*np.pi*(55+90*np.exp(-tt*40))*tt)*np.exp(-tt*25),t,0.35 if k%4==0 else 0.0)
    t+=step; k+=1
# SFX
def whoosh(t,g=0.14,d=0.5):
    n=int(d*SR); add(np.random.uniform(-1,1,n)*np.sin(np.linspace(0,np.pi,n))**2*g,t)
whoosh(0.0,0.18,0.45)
for s in (1,2,3,4): add(tone(1400,0.08,d=0.03,harm=(1,.3)),s,0.45)
whoosh(5.0,0.16,0.6)
for s,f in ((5.8,523),(6.7,587),(7.6,659),(8.5,784)): add(tone(f,0.35,d=0.12),s,0.45)
for f in (1047,1319,1568): add(tone(f,1.2,d=0.5),9.4,0.28)
whoosh(10.5,0.14,0.6)
fade=int(1.2*SR); out[-fade:]*=np.linspace(1,0,fade)
out=out/np.max(np.abs(out))*0.85
s=(np.repeat(out[:,None],2,1)*32767).astype(np.int16)
w=wave.open('bed_v2.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(s.tobytes()); w.close()
