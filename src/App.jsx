import VideoPanel from './components/VideoPanel';

function App() {
  return (
    <div className="h-screen w-screen grid grid-cols-2 grid-rows-2 gap-0 bg-black">
      <VideoPanel panelId="panel-1" />
      <VideoPanel panelId="panel-2" />
      <VideoPanel panelId="panel-3" />
      <VideoPanel panelId="panel-4" />
    </div>
  );
}

export default App;
