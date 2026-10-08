import { act, renderHook } from '@testing-library/react';
import { test, expect, vi } from 'vitest';
import { useRecording } from '../combined/useRecording';
test('cancelled microphone permission cannot leave tracks running or deliver text', async () => {
 let resolve!: (s: unknown) => void; const getUserMedia=vi.fn(()=>new Promise(r=>{resolve=r;}));
 vi.stubGlobal('navigator',{mediaDevices:{getUserMedia}});
 const stop=vi.fn(), onText=vi.fn();
 const {result}=renderHook(()=>useRecording(onText));let pending!: Promise<void>;
 act(()=>{pending=result.current.start();});expect(result.current.state).toBe('requesting');
 act(()=>result.current.cancel());await act(async()=>{resolve({getTracks:()=>[{stop}]});await pending;});
 expect(stop).toHaveBeenCalledTimes(1);expect(onText).not.toHaveBeenCalled();expect(result.current.state).toBe('idle');
});
test('unmounting while permission is pending releases any late microphone stream', async () => {
 let resolve!: (s: unknown) => void;vi.stubGlobal('navigator',{mediaDevices:{getUserMedia:()=>new Promise(r=>{resolve=r;})}});
 const stop=vi.fn(), onText=vi.fn();const {result,unmount}=renderHook(()=>useRecording(onText));let pending!: Promise<void>;
 act(()=>{pending=result.current.start();});unmount();await act(async()=>{resolve({getTracks:()=>[{stop}]});await pending;});expect(stop).toHaveBeenCalledTimes(1);expect(onText).not.toHaveBeenCalled();
});
test('microphone level updates with sound and resets on cancel', async () => {
 vi.useFakeTimers();
 let amplitude = 0;
 const stopTrack = vi.fn();
 vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => ({ getTracks: () => [{ stop:stopTrack }] }) } });
 class Recorder { static isTypeSupported() { return true; } state='inactive'; onstop=null; start() { this.state='recording'; } stop() { this.state='inactive'; } }
 class Meter { resume=async()=>{}; close=async()=>{}; createMediaStreamSource=()=>({ connect:vi.fn() }); createAnalyser=()=>({ fftSize:2048, getFloatTimeDomainData:(samples:Float32Array)=>samples.fill(amplitude) }); }
 vi.stubGlobal('MediaRecorder',Recorder);vi.stubGlobal('AudioContext',Meter);
 const onText=vi.fn(), {result,unmount}=renderHook(()=>useRecording(onText));
 try {
  await act(async()=>{await result.current.start();});
  act(()=>vi.advanceTimersByTime(300));expect(result.current.state).toBe('listening');expect(result.current.level).toBeLessThan(.1);
  amplitude=.002;act(()=>vi.advanceTimersByTime(100));expect(result.current.level).toBeLessThan(.1);
  amplitude=.04;act(()=>vi.advanceTimersByTime(100));expect(result.current.level).toBeGreaterThan(.1);
  amplitude=0;act(()=>vi.advanceTimersByTime(100));expect(result.current.level).toBe(0);
  act(()=>vi.advanceTimersByTime(300));expect(result.current.level).toBeLessThan(.1);
  amplitude=.04;act(()=>vi.advanceTimersByTime(100));expect(result.current.level).toBeGreaterThan(.1);
  act(()=>result.current.cancel());expect(result.current.level).toBeLessThan(.1);expect(stopTrack).toHaveBeenCalledOnce();expect(onText).not.toHaveBeenCalled();
 } finally { unmount();vi.useRealTimers(); }
});
