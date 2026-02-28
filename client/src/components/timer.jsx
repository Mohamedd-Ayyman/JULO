import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Clock } from "lucide-react";
import { tick } from "../redux/timeSlice.js";
import { hideLoader, showLoader } from "../redux/loaderSlice.js";

const Timer = () => {
  const dispatch = useDispatch();
  const { elapsed } = useSelector((state) => state.timeReducer);

  useEffect(() => {
    dispatch(showLoader());
    dispatch(tick());
    dispatch(hideLoader());

    const interval = setInterval(() => {
      dispatch(tick());
    }, 1000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const formatTime = (seconds) => {
    const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return { hours: h, minutes: m, seconds: s };
  };

  const { hours, minutes, seconds } = formatTime(elapsed);

  return (
    <div className="px-6 mb-6">
      <div className="backdrop-blur-xl bg-glass/10 border border-glass-border/20 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3 ">
            <div className="backdrop-blur-lg bg-glass/20 border border-glass-border/30 p-2 rounded-xl">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground ">
              Time to launch
            </h3>
          </div>
          <div className="backdrop-blur-lg bg-glass/20 border border-glass-border/30 px-3 py-1 rounded-full">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-foreground text-sm font-medium">
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center space-x-2">
          <div className="text-center">
            <div className="backdrop-blur-lg bg-glass/20 border border-glass-border/30 rounded-xl p-4 min-w-[80px]">
              <div className="text-2xl md:text-3xl font-bold text-primary font-mono">
                {hours}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                HOURS
              </div>
            </div>
          </div>

          <div className="text-primary text-2xl font-bold">:</div>

          <div className="text-center">
            <div className="backdrop-blur-lg bg-glass/20 border border-glass-border/30 rounded-xl p-4 min-w-[80px]">
              <div className="text-2xl md:text-3xl font-bold text-primary font-mono">
                {minutes}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                MINUTES
              </div>
            </div>
          </div>

          <div className="text-primary text-2xl font-bold">:</div>

          <div className="text-center">
            <div className="backdrop-blur-lg bg-glass/20 border border-glass-border/30 rounded-xl p-4 min-w-[80px]">
              <div className="text-2xl md:text-3xl font-bold text-primary font-mono">
                {seconds}
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                SECONDS
              </div>
            </div>
          </div>
        </div>

        {/* <div className="mt-4 text-center">
          <p className="text-muted-foreground text-sm">
            : {hours}:{minutes}:{seconds}
          </p>
        </div> */}
      </div>
    </div>
  );
};

export default Timer;
