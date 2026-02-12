import { render, screen } from "@testing-library/react";
import { act } from "react";
import { clearToken, setToken } from "@/lib/api/auth";
import { useAuthToken } from "@/lib/auth/useAuthToken";

function TokenProbe() {
  const token = useAuthToken();
  return <div data-testid="token">{token ?? ""}</div>;
}

describe("useAuthToken", () => {
  it("updates when token changes", () => {
    window.localStorage.removeItem("token");
    render(<TokenProbe />);

    expect(screen.getByTestId("token")).toHaveTextContent("");

    act(() => {
      setToken("abc");
    });
    expect(screen.getByTestId("token")).toHaveTextContent("abc");

    act(() => {
      clearToken();
    });
    expect(screen.getByTestId("token")).toHaveTextContent("");
  });
});

