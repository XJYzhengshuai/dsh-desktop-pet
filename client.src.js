window.__ModuleLoader__.load({
  id: 'dsh-desktop-pet',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useCallback, useEffect, useRef, useState } = React;

    // Filled in by tools/build-client.mjs so the module stays self-contained:
    // no Host route, no extra request, works in every deployment.
    const PET_SRC = '__PET_SRC__';
    const VOICE_SRC = '__VOICE_SRC__';

    const CSS = [
      '.dp-root{position:fixed;right:22px;bottom:18px;z-index:80;width:118px;pointer-events:none;user-select:none;-webkit-user-select:none;font-family:inherit}',
      '.dp-stage{position:relative;width:100%;pointer-events:auto}',
      '.dp-img{display:block;width:100%;height:auto;cursor:pointer;transform-origin:50% 100%;filter:drop-shadow(0 12px 18px rgba(0,0,0,.28));will-change:transform}',
      '.dp-shadow{position:absolute;left:50%;bottom:-6px;width:72%;height:12px;transform:translateX(-50%);background:radial-gradient(closest-side,rgba(0,0,0,.32),rgba(0,0,0,0));border-radius:50%;pointer-events:none}',
      '.dp-bubble{position:absolute;left:50%;bottom:calc(100% - 2px);transform:translate(-50%,4px);background:#fff;color:#1b1b1f;font-size:12px;line-height:1;padding:7px 10px;border-radius:11px;box-shadow:0 6px 18px rgba(0,0,0,.18);white-space:nowrap;opacity:0;transition:opacity .18s ease,transform .18s ease;pointer-events:none}',
      '.dp-bubble:after{content:"";position:absolute;left:50%;bottom:-4px;width:10px;height:10px;background:#fff;transform:translateX(-50%) rotate(45deg);border-radius:2px}',
      '.dp-working .dp-bubble,.dp-done .dp-bubble,.dp-poke .dp-bubble{opacity:1;transform:translate(-50%,0)}',
      '.dp-dots{display:inline-block;margin-left:3px}',
      '.dp-dots i{display:inline-block;width:3px;height:3px;margin-left:2px;border-radius:50%;background:#1b1b1f;opacity:.3;animation:dp-dot 1.2s ease-in-out infinite}',
      '.dp-dots i:nth-child(2){animation-delay:.15s}',
      '.dp-dots i:nth-child(3){animation-delay:.3s}',
      '.dp-dismiss{position:absolute;top:-6px;right:-6px;width:18px;height:18px;border-radius:50%;border:none;background:rgba(20,20,22,.55);color:#fff;font-size:12px;line-height:18px;text-align:center;cursor:pointer;opacity:0;transition:opacity .15s ease;pointer-events:auto;padding:0}',
      '.dp-stage:hover .dp-dismiss{opacity:1}',
      '.dp-idle .dp-img{animation:dp-breathe 3.8s ease-in-out infinite}',
      '.dp-working .dp-img{animation:dp-bob .62s ease-in-out infinite}',
      '.dp-done .dp-img{animation:dp-hop .52s ease-in-out 5}',
      '.dp-working .dp-shadow{animation:dp-shadow-bob .62s ease-in-out infinite}',
      '.dp-done .dp-shadow{animation:dp-shadow-hop .52s ease-in-out 5}',
      '.dp-working .dp-stage:before{content:"";position:absolute;inset:-10px -6px 6px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,196,0,.22),transparent 70%);animation:dp-glow 1.4s ease-in-out infinite;pointer-events:none}',
      '@keyframes dp-breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-3px) scale(1.012)}}',
      '@keyframes dp-bob{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-9px) rotate(1.5deg)}}',
      '@keyframes dp-hop{0%,100%{transform:translateY(0) rotate(0)}30%{transform:translateY(-14px) rotate(-4deg)}60%{transform:translateY(0) rotate(3deg)}}',
      '@keyframes dp-shadow-bob{0%,100%{transform:translateX(-50%) scaleX(1);opacity:.35}50%{transform:translateX(-50%) scaleX(.82);opacity:.22}}',
      '@keyframes dp-shadow-hop{0%,100%{transform:translateX(-50%) scaleX(1)}35%{transform:translateX(-50%) scaleX(.72)}}',
      '@keyframes dp-glow{0%,100%{opacity:.45}50%{opacity:1}}',
      '@keyframes dp-dot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-2px)}}',
      '@media (prefers-reduced-motion: reduce){.dp-img,.dp-shadow,.dp-dots i,.dp-working .dp-stage:before{animation:none!important}}',
    ].join('\n');

    /** Audio element is created lazily; a rejected play() (autoplay policy) stays silent. */
    function useVoice() {
      const ref = useRef(null);
      return useCallback(() => {
        try {
          if (!ref.current) {
            ref.current = new Audio(VOICE_SRC);
            ref.current.preload = 'auto';
            ref.current.volume = 0.9;
          }
          const el = ref.current;
          el.pause();
          el.currentTime = 0;
          const played = el.play();
          if (played && typeof played.catch === 'function') played.catch(() => {});
        } catch (error) {
          /* no audio device or blocked: the pet still animates */
        }
      }, []);
    }

    function useAnyRunning(useSessions) {
      // Selector stays referentially stable so the slot store does not re-render.
      const selector = useCallback((state) => {
        const byId = state && state.byId;
        if (!byId) return false;
        for (const id in byId) {
          const session = byId[id];
          if (session && session.running) return true;
        }
        return false;
      }, []);
      if (typeof useSessions !== 'function') return false;
      return useSessions(selector);
    }

    function DesktopPet(props) {
      const running = useAnyRunning(props.useSessions);
      const [phase, setPhase] = useState('idle'); // idle | working | done
      const [poke, setPoke] = useState(false);
      const [dismissed, setDismissed] = useState(false);
      const prevRunning = useRef(false);
      const timers = useRef([]);
      const playVoice = useVoice();

      const clearTimers = useCallback(() => {
        for (const id of timers.current) clearTimeout(id);
        timers.current = [];
      }, []);

      useEffect(() => clearTimers, [clearTimers]);

      useEffect(() => {
        if (running) {
          clearTimers();
          setPhase('working');
        } else if (prevRunning.current) {
          setPhase('done');
          playVoice();
          timers.current.push(setTimeout(() => setPhase('idle'), 3800));
        }
        prevRunning.current = running;
      }, [running, clearTimers, playVoice]);

      const onPetClick = useCallback(() => {
        playVoice();
        setPoke(true);
        timers.current.push(setTimeout(() => setPoke(false), 1800));
      }, [playVoice]);

      if (dismissed) return null;

      const text = poke ? '你干嘛！' : phase === 'working' ? '思考中' : phase === 'done' ? '搞定啦！' : '';
      const bubble = text
        ? h('div', { className: 'dp-bubble' },
            text,
            phase === 'working' && !poke
              ? h('span', { className: 'dp-dots' }, h('i'), h('i'), h('i'))
              : null)
        : null;

      const className = 'dp-root dp-' + phase + (poke ? ' dp-poke' : '');

      return h(React.Fragment, null,
        h('style', null, CSS),
        h('div', { className, 'data-phase': phase },
          h('div', { className: 'dp-stage' },
            bubble,
            h('img', {
              className: 'dp-img',
              src: PET_SRC,
              alt: '桌宠',
              draggable: false,
              onClick: onPetClick,
            }),
            h('div', { className: 'dp-shadow' }),
            h('button', {
              className: 'dp-dismiss',
              type: 'button',
              title: '收起桌宠（刷新页面后回来）',
              'aria-label': '收起桌宠',
              onClick: () => setDismissed(true),
            }, '\u00d7')
          )
        )
      );
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'desktop-pet',
          order: 50,
        }, DesktopPet));
      },
    };
  },
});
